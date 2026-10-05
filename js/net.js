// Plush Squad — online part (Supabase): username+password accounts, cloud saves, friends by code,
// friends' squads as rivals, gifts, stickers, the weekly co-op Kraken, Star Catch board and the toy museum.
// Everything here is optional: without js/config.js values (or offline) the game plays exactly as before.
(function () {
  'use strict';
  const CFG = window.PS_CONFIG || {};
  const KEY = 'plushsquad_v1';
  const S = () => (window.__save && window.__save.data) || {};
  const STICKERS = [
    { id: 'gg', label: 'GG!', icon: 'j:thumbs' }, { id: 'rematch', label: 'REMATCH?', icon: 'j:game' },
    { id: 'lol', label: 'LOL', icon: 'j:joy' }, { id: 'cool', label: 'COOL', icon: 'j:cool' },
    { id: 'wow', label: 'WOW!', icon: 'j:partyface' }, { id: 'hug', label: 'HUG', icon: 'j:hug' },
    { id: 'zzz', label: 'ZZZ...', icon: 'zzz' }, { id: 'space', label: 'INTO SPACE!', icon: 'aliens' },
  ];
  const STK = {}; STICKERS.forEach(s => STK[s.id] = s);
  const BAD = /(fuck|shit|bitch|dick|cunt|nigg|fag|porn|sex|kill|nazi|hitler|xyu|hui|pizd|blya|suka)/i;
  // names typed on other devices are shown here only through the kid-safe filter (QA B13 / #16)
  const T = () => window.PSToys || {};
  const okName = (n, fb) => T().badName && T().badName(n) ? fb : n;
  const okUser = n => n != null && BAD.test(n) ? 'Player' : okName(n, 'Player'); // the sign-up rule, then the toy-name filter
  const okToy = meta => { if (meta && meta.name != null) meta.name = okName(meta.name, ((T().ARCH_BY_ID || {})[meta.arch] || { nicks: ['Plushie'] }).nicks[0]); return meta; };

  const Net = {
    ready: false, sb: null, user: null, unread: 0, inboxCache: [], boss: null, _push: 0, _lastInbox: 0,
    async init() {
      if (!CFG.url || !CFG.key || !window.supabase) return;
      try {
        this.sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'plushsquad-auth' } });
        this.ready = true;
        const { data } = await this.sb.auth.getSession();
        if (data && data.session) { await this.loadProfile(data.session.user); setTimeout(() => this.catchUp(), 5000); } // after the game has loaded the save
      } catch (e) { console.warn('net init', e); }
    },
    email: name => name.toLowerCase() + '@' + (CFG.userDomain || 'players.plushsquad.app'),
    checkName(name) {
      name = (name || '').trim().toLowerCase();
      if (!/^[a-z0-9_]{3,16}$/.test(name)) return 'Use 3-16 letters, numbers or _';
      if (BAD.test(name)) return 'Please pick a different name';
      return null;
    },
    async loadProfile(u) {
      const { data } = await this.sb.from('profiles').select('username, code').eq('id', u.id).maybeSingle();
      this.user = { id: u.id, name: data ? data.username : (u.email || '').split('@')[0], code: data ? data.code : null };
      if (!data) { // profile missing (sign-up interrupted): create it now
        const r = await this.sb.rpc('init_profile', { p_username: this.user.name });
        if (r.data) { this.user.code = r.data.code; this.pendingRecovery = r.data.recovery; }
      }
    },
    // ---- accounts
    async signup(name, pass) {
      const bad = this.checkName(name); if (bad) throw new Error(bad);
      if ((pass || '').length < 6) throw new Error('Password needs at least 6 characters');
      name = name.trim().toLowerCase();
      const free = await this.sb.rpc('username_free', { p_name: name });
      if (free.data === false) throw new Error('This name is taken. Try another one!');
      const { data, error } = await this.sb.auth.signUp({ email: this.email(name), password: pass });
      if (error) throw new Error(/registered|exists/i.test(error.message) ? 'This name is taken. Try another one!' : error.message);
      if (!data.session) throw new Error('Ask a grown-up to turn off "Confirm email" in Supabase');
      const r = await this.sb.rpc('init_profile', { p_username: name });
      if (r.error) throw new Error(r.error.message);
      this.user = { id: data.user.id, name, code: r.data.code };
      await this.adoptLocal();
      return r.data.recovery;
    },
    async login(name, pass) {
      name = (name || '').trim().toLowerCase();
      const { data, error } = await this.sb.auth.signInWithPassword({ email: this.email(name), password: pass });
      if (error) throw new Error(/invalid/i.test(error.message) ? 'Wrong name or password' : error.message);
      await this.loadProfile(data.user);
      return this.reconcile();
    },
    async logout() {
      // save the last few seconds of progress first (QA B14)
      clearTimeout(this._push);
      try { await this.pushNow(); } catch (e) {}
      try { await this.sb.auth.signOut(); } catch (e) {}
      this.user = null;
      // the progress is safe in the cloud; this device goes back to a fresh guest
      try { localStorage.removeItem(KEY); } catch (e) {}
      try { const db = await window.__IDB.open(); await new Promise(r => { const tx = db.transaction('img', 'readwrite'); tx.objectStore('img').clear(); tx.oncomplete = r; tx.onerror = r; }); } catch (e) {}
    },
    async resetPassword(name, code, pass) {
      if ((pass || '').length < 6) throw new Error('Password needs at least 6 characters');
      const { data, error } = await this.sb.rpc('reset_password', { p_username: name.trim().toLowerCase(), p_code: code, p_new: pass });
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Name or recovery code is wrong');
      return true;
    },
    async newRecovery() { const { data } = await this.sb.rpc('new_recovery_code'); return data; },
    // ---- saves
    summary: d => ({ level: lvl(d.xp || 0), wins: d.wins || 0, toys: (d.toys || []).length }),
    // after login: which save wins? returns null when done, or {cloud, local} when the kid must choose
    async reconcile() {
      const { data: row } = await this.sb.from('saves').select('data, updated_at').eq('user_id', this.user.id).maybeSingle();
      const local = S();
      const fresh = !(local.xp || 0) && !(local.toys || []).length && !(local.wins || 0);
      if (!row) { await this.adoptLocal(); return null; }
      if (fresh) { await this.applyCloud(row.data); return null; }
      if (local.owner === this.user.id) {
        if ((local.savedAt || 0) > (row.data.savedAt || 0)) { await this.adoptLocal(); return null; }
        await this.applyCloud(row.data); return null;
      }
      this._conflict = row.data;
      return { cloud: this.summary(row.data), local: this.summary(local) };
    },
    // on start with a kept login: progress made here that never reached the cloud (the app was closed before the
    // 15 s push) goes up now, unless the cloud already holds something newer
    async catchUp() {
      try {
        const d = S(); if (!this.user || d.owner !== this.user.id) return;
        const { data: row } = await this.sb.from('saves').select('data').eq('user_id', this.user.id).maybeSingle();
        if (!row || (d.savedAt || 0) > ((row.data && row.data.savedAt) || 0)) await this.pushNow();
      } catch (e) {}
    },
    async resolve(which) { if (which === 'cloud') await this.applyCloud(this._conflict); else await this.adoptLocal(); this._conflict = null; },
    async adoptLocal() {
      const d = S(); d.owner = this.user.id; d.savedAt = Date.now();
      try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
      await this.pushNow();
      for (const t of d.toys || []) { try { const url = await window.__IDB.get(t.id); if (url) await this.uploadToy(t, url); } catch (e) {} }
    },
    async applyCloud(data) {
      data.owner = this.user.id;
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
      // bring the toy pictures to this device
      const ids = (data.toys || []).map(t => this.user.id + ':' + t.id);
      if (ids.length) {
        const { data: rows } = await this.sb.from('toys').select('id, img').in('id', ids);
        for (const r of rows || []) {
          try {
            const blob = await (await fetch(r.img)).blob();
            const url = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
            await window.__IDB.set(r.id.split(':').slice(1).join(':'), url);
          } catch (e) {}
        }
      }
    },
    schedulePush() { if (!this.user) return; clearTimeout(this._push); this._push = setTimeout(() => this.pushNow(), 15000); },
    async pushNow() {
      if (!this.user) return;
      const d = S(); if (!d || d.owner !== this.user.id) return;
      try {
        await this.sb.from('saves').upsert({ user_id: this.user.id, data: d, updated_at: new Date().toISOString() });
        const hero = d.hero && d.hero !== 'jack' ? (d.toys || []).find(t => t.id === d.hero) : null;
        await this.sb.from('profiles').update({ level: lvl(d.xp || 0), wins: d.wins || 0, stickers: Object.keys(d.ach || {}).length,
          stars: Object.values(d.stars || {}).reduce((a, b) => a + b, 0), title: d.title || 'Plush Friend',
          avatar: { hero: hero ? hero.id : 'jack', name: hero ? hero.name : 'Jack', img: hero ? this.toyUrl(hero.id) : null, costume: d.costume || 'none' },
          updated_at: new Date().toISOString() }).eq('id', this.user.id);
        // toys deleted on this device disappear from the cloud too
        const { data: rows } = await this.sb.from('toys').select('id').eq('owner', this.user.id);
        const keep = new Set((d.toys || []).map(t => this.user.id + ':' + t.id));
        const gone = (rows || []).map(r => r.id).filter(id => !keep.has(id));
        if (gone.length) await this.sb.from('toys').delete().in('id', gone);
      } catch (e) { console.warn('push', e); }
    },
    toyUrl(id) { return CFG.url + '/storage/v1/object/public/toys/' + this.user.id + '/' + encodeURIComponent(id) + '.png'; },
    async uploadToy(t, dataUrl) {
      if (!this.user) return;
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const path = this.user.id + '/' + t.id + '.png';
        await this.sb.storage.from('toys').upload(path, blob, { upsert: true, contentType: 'image/png' });
        await this.sb.from('toys').upsert({ id: this.user.id + ':' + t.id, owner: this.user.id, meta: t, img: this.toyUrl(t.id) });
      } catch (e) { console.warn('toy upload', e); }
    },
    // ---- friends + inbox
    async friends() {
      const { data } = await this.sb.rpc('my_friends');
      return (data || []).map(f => Object.assign(f, { username: okUser(f.username), avatar: f.avatar && f.avatar.name ? Object.assign(f.avatar, { name: okName(f.avatar.name, 'Toy') }) : f.avatar }));
    },
    async addFriend(code) { const { data, error } = await this.sb.rpc('add_friend', { p_code: code }); if (error) throw new Error(error.message); return data; },
    async removeFriend(id) { await this.sb.rpc('remove_friend', { p_id: id }); },
    async squad(id) { const { data } = await this.sb.from('toys').select('id, meta, img').eq('owner', id).order('created_at'); return (data || []).map(t => (okToy(t.meta), t)); },
    async send(to, kind, payload) { const { data, error } = await this.sb.rpc('send_inbox', { p_to: to, p_kind: kind, p_payload: payload || {} }); if (error) throw new Error(error.message); return data; },
    async inbox() {
      if (!this.user) return [];
      const { data } = await this.sb.from('inbox').select('*').eq('done', false).order('created_at', { ascending: false }).limit(30);
      this.inboxCache = (data || []).map(m => { m.from_name = m.from_name && okUser(m.from_name); if (m.payload && m.payload.toy) m.payload.toy = okName(m.payload.toy, 'toy'); return m; });
      this.unread = this.inboxCache.length; this._lastInbox = Date.now();
      return this.inboxCache;
    },
    async claim(id) { const { data } = await this.sb.rpc('claim_inbox', { p_id: id }); this.inboxCache = this.inboxCache.filter(m => m.id !== id); this.unread = this.inboxCache.length; return data; },
    // ---- co-op boss, scores, museum
    async bossStatus() { const { data, error } = await this.sb.rpc('boss_status'); if (error || !data) throw error || new Error('no boss'); this.boss = data; return data; }, // (QA B23)
    async bossStart() { const { data } = await this.sb.rpc('boss_start'); return !!data; },
    async bossHit(d) { const { data } = await this.sb.rpc('boss_hit', { p_dmg: d }); this.boss = data; return data; },
    async bossClaim() { const { data } = await this.sb.rpc('boss_claim'); return !!data; },
    async submitCatch(n) { try { await this.sb.rpc('submit_catch', { p_score: n }); } catch (e) {} },
    async board() { const { data } = await this.sb.rpc('catch_board'); return (data || []).map(r => Object.assign(r, { username: okUser(r.username) })); },
    async museum() { const { data } = await this.sb.rpc('museum'); return (data || []).map(t => (okToy(t.meta), Object.assign(t, { username: okUser(t.username) }))); },
    async like(id) { const { data } = await this.sb.rpc('toggle_like', { p_toy: id }); return data || 0; },
  };
  const lvl = x => { let l = 1, r = x; while (r >= 100 + (l - 1) * 50) { r -= 100 + (l - 1) * 50; l++; } return l; };
  window.PSNet = Net;
  window.PSOnSave = d => { d.savedAt = Date.now(); if (Net.user && d.owner === Net.user.id) Net.schedulePush(); };
  const flush = () => { if (Net._push) { clearTimeout(Net._push); Net._push = 0; Net.pushNow(); } };
  window.addEventListener('pagehide', flush);
  // iOS does not send pagehide when the player switches apps or locks the phone: push then too
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

  // ---------- UI helpers
  function input(scene, PS, x, y, w, ph, type) {
    const el = document.createElement('input');
    el.type = type || 'text'; el.placeholder = ph; el.autocomplete = 'off'; el.autocapitalize = 'none'; el.spellcheck = false; el.maxLength = 32;
    el.style.cssText = 'font:700 40px Poppins,Arial,sans-serif;color:#1d2163;background:#fff3d2;border:0;border-radius:22px;padding:10px 22px;width:' + w + 'px;text-align:center;outline:none;box-sizing:border-box';
    scene.add.dom(x, y, el);
    return el;
  }
  // a friend's picture (toy or Jack) as a texture; resolves to the texture key
  async function friendTex(scene, PS, av) {
    if (av && av.img) { const k = 'fav_' + av.hero; if (scene.textures.exists(k) || await PS.addTexture(scene, k, av.img)) return k; }
    return 'jack_front';
  }
  function avatarImg(scene, PS, x, y, key, size) { const im = scene.add.image(x, y, key); im.setScale(size / Math.max(im.width, im.height)); return im; }
  function err(scene, PS, msg, y) {
    const t = PS.txt(scene, PS.W / 2, y, msg, 32, '#ff9ed8', { st: 6, wrap: PS.W - 100 }).setDepth(80);
    scene.tweens.add({ targets: t, alpha: 0, delay: 2600, duration: 400, onComplete: () => t.destroy() });
  }

  function scenes(PS) {
    const { W, H, PORTRAIT, C, A, Save, txt, fit, img, iconScale, button, chip, fade } = PS;
    const X = () => window.PSExtra;

    // ---------- LOG IN / SIGN UP / FORGOT
    class AccountScene extends Phaser.Scene {
      constructor() { super('account'); }
      init(data) { this.tab = (data && data.tab) || 'login'; }
      create() {
        X().header(this, PS, this.tab === 'signup' ? 'NEW PLAYER' : this.tab === 'forgot' ? 'NEW PASSWORD' : 'LOG IN', 'me');
        if (!Net.ready) { txt(this, W / 2, H / 2, 'Online play is not set up yet', 44, '#fff3d2', { st: 7 }); return; }
        const cx = W / 2, top = PORTRAIT ? 330 : 190, iw = Math.min(W - 160, 640);
        // tabs
        const tabs = [['login', 'LOG IN'], ['signup', 'SIGN UP'], ['forgot', 'FORGOT?']];
        tabs.forEach(([k, l], i) => {
          const b = button(this, cx + (i - 1) * 260, top, 240, 84, l, k === this.tab ? C.star : C.night3, () => { if (k !== this.tab) this.scene.restart({ tab: k }); }, { size: 32, color: k === this.tab ? C.ink : '#fff3d2' });
          b.setDepth(5);
        });
        const y0 = top + (PORTRAIT ? 150 : 120), gap = PORTRAIT ? 120 : 105;
        this.name = input(this, PS, cx, y0, iw, 'name', 'text');
        if (this.tab === 'forgot') this.code = input(this, PS, cx, y0 + gap, iw, 'recovery code', 'text');
        this.pass = input(this, PS, cx, y0 + gap * (this.tab === 'forgot' ? 2 : 1), iw, this.tab === 'forgot' ? 'new password' : 'password', 'password');
        const by = y0 + gap * (this.tab === 'forgot' ? 3 : 2) + 20;
        const label = { login: 'LOG IN', signup: 'CREATE PLAYER', forgot: 'SET PASSWORD' }[this.tab];
        this.go = button(this, cx, by, 480, 120, label, C.star, () => this.submit(), { size: 44 });
        const hint = { login: 'Use the name and password you made before.',
          signup: 'Pick a fun name (not your real full name!) and a password a grown-up writes down.',
          forgot: 'Type your name, the recovery code you got when you signed up, and a new password.' }[this.tab];
        txt(this, cx, by + 120, hint, 28, '#bcc0ee', { st: 5, weight: '500', wrap: Math.min(W - 100, 900) });
        this.errY = by + 200;
        [this.name, this.pass, this.code].forEach(el => el && el.addEventListener('keydown', e => { if (e.key === 'Enter') this.submit(); }));
      }
      async submit() {
        if (this.busy) return; this.busy = true;
        const name = this.name.value, pass = this.pass.value;
        document.activeElement && document.activeElement.blur && document.activeElement.blur();
        const wait = txt(this, W / 2, this.errY, '...', 40, '#fff3d2', { st: 6 });
        try {
          if (this.tab === 'signup') {
            const rc = await Net.signup(name, pass);
            wait.destroy(); A.win(); this.showRecovery(rc);
          } else if (this.tab === 'forgot') {
            await Net.resetPassword(name, this.code.value, pass);
            wait.destroy(); A.win();
            this.scene.restart({ tab: 'login' });
          } else {
            const conflict = await Net.login(name, pass);
            wait.destroy(); A.win();
            if (conflict) this.choose(conflict); else this.done();
          }
        } catch (e) { wait.destroy(); A.block(); err(this, PS, e.message || 'Something went wrong', this.errY); }
        this.busy = false;
      }
      // DOM inputs float above the canvas: hide them under full-screen overlays
      hideInputs() { [this.name, this.pass, this.code].forEach(el => { if (el) { el.blur(); el.style.visibility = 'hidden'; } }); }
      showRecovery(rc) {
        this.hideInputs();
        const lay = this.add.container(0, 0).setDepth(90);
        lay.add(this.add.rectangle(W / 2, H / 2, W, H, 0x0f1240, 0.94).setInteractive());
        lay.add(txt(this, W / 2, H * 0.22, 'Welcome, ' + Net.user.name + '!', 64, '#ffd23f', { st: 9 }));
        lay.add(txt(this, W / 2, H * 0.34, 'Your RECOVERY CODE. Ask a grown-up to write it down or take a photo. It is the only way to get back in if you forget your password!', 32, '#fff3d2', { st: 5, weight: '500', wrap: Math.min(W - 100, 900) }));
        lay.add(txt(this, W / 2, H * 0.48, rc || '(ask a grown-up)', 96, '#7fe39a', { st: 12 }));
        lay.add(txt(this, W / 2, H * 0.58, 'Your friend code: ' + Net.user.code, 40, '#fff3d2', { st: 6 }));
        lay.add(button(this, W / 2, H * 0.72, 520, 120, 'I WROTE IT DOWN', C.star, () => this.done(), { size: 42 }));
      }
      choose(c) {
        this.hideInputs();
        const lay = this.add.container(0, 0).setDepth(90);
        lay.add(this.add.rectangle(W / 2, H / 2, W, H, 0x0f1240, 0.94).setInteractive());
        lay.add(txt(this, W / 2, H * 0.25, 'Which progress do you want to keep?', 52, '#ffd23f', { st: 8, wrap: W - 100 }));
        const opt = (x, y, title, s, which) => {
          lay.add(button(this, x, y, 460, 200, '', which === 'cloud' ? C.star : C.cream, async () => { await Net.resolve(which); this.done(); }, { size: 10 }));
          lay.add(txt(this, x, y - 40, title, 40, C.ink, { st: 0, shadow: false }));
          lay.add(txt(this, x, y + 30, 'Level ' + s.level + ' · ' + s.wins + ' wins · ' + s.toys + ' toys', 28, '#4a4f8c', { st: 0, shadow: false, weight: '500' }));
        };
        opt(PORTRAIT ? W / 2 : W / 2 - 260, PORTRAIT ? H * 0.42 : H * 0.55, 'ACCOUNT', c.cloud, 'cloud');
        opt(PORTRAIT ? W / 2 : W / 2 + 260, PORTRAIT ? H * 0.62 : H * 0.55, 'THIS DEVICE', c.local, 'local');
      }
      done() { window.__psRebuild ? window.__psRebuild({ key: 'title', data: {} }) : fade(this, 'title'); }
    }

    // ---------- FRIENDS hub: friends, mail, museum, top catch
    class FriendsScene extends Phaser.Scene {
      constructor() { super('friends'); }
      init(data) { this.tab = (data && data.tab) || 'friends'; this.mailPage = (data && data.mailPage) || 0; }
      create() {
        X().header(this, PS, 'FRIENDS');
        if (!Net.ready) { txt(this, W / 2, H / 2, 'Online play is not set up yet', 44, '#fff3d2', { st: 7 }); return; }
        if (!Net.user) {
          txt(this, W / 2, H * 0.4, 'Log in to add friends, send gifts and duel their toys!', 44, '#fff3d2', { st: 7, wrap: W - 120 });
          button(this, W / 2, H * 0.55, 520, 120, 'LOG IN / SIGN UP', C.star, () => fade(this, 'account'), { size: 42 });
          return;
        }
        const tabs = [['friends', 'FRIENDS', 'j:friends'], ['mail', 'MAIL', 'j:mail'], ['museum', 'MUSEUM', 'j:museum'], ['top', 'TOP CATCH', 'star']];
        const ty = PORTRAIT ? 290 : 175, tw = Math.min(250, (W - 80) / 4 - 14);
        tabs.forEach(([k, l, ic], i) => {
          const x = W / 2 + (i - 1.5) * (tw + 14), on = k === this.tab;
          const b = this.add.container(x, ty);
          b.add(X().card(this, PS, 0, 0, tw, 80, on ? C.star : C.night2, on ? 0xffffff : C.seam));
          const im = img(this, -tw / 2 + 38, 0, ic); im.setScale(iconScale(ic, 50)); b.add(im);
          b.add(fit(txt(this, 18, 0, l, 26, on ? C.ink : '#fff3d2', { st: 0, shadow: false }), tw - 80));
          if (k === 'mail' && Net.unread) { b.add(this.add.circle(tw / 2 - 8, -34, 18, C.coral)); b.add(txt(this, tw / 2 - 8, -34, String(Net.unread), 20, '#fff', { st: 0, shadow: false })); }
          b.setSize(tw, 80).setInteractive({ useHandCursor: true }); PS.press(this, b);
          b.on('pointerup', () => { if (!on) { A.click(); this.scene.restart({ tab: k }); } });
        });
        this.top = ty + 80;
        this.loading = txt(this, W / 2, H / 2, 'Loading...', 40, '#bcc0ee', { st: 6 });
        const run = { friends: () => this.showFriends(), mail: () => this.showMail(), museum: () => this.showMuseum(), top: () => this.showTop() }[this.tab];
        run().catch(e => { console.warn(e); this.loading.setText('Could not connect. Check the internet!'); });
      }
      clearLoading() { if (this.loading) { this.loading.destroy(); this.loading = null; } }
      // --- friends list
      async showFriends() {
        const list = await Net.friends(); this.clearLoading();
        const y0 = this.top + 40;
        txt(this, W / 2, y0 + 10, 'My code: ' + (Net.user.code || '...'), 46, '#7fe39a', { st: 7 });
        txt(this, W / 2, y0 + 62, 'Tell this code to a friend, or type theirs:', 28, '#bcc0ee', { st: 5, weight: '500' });
        const el = this.codeEl = input(this, PS, W / 2 - 150, y0 + 140, 360, 'ABCD-EF', 'text'); el.maxLength = 7; el.style.textTransform = 'uppercase';
        button(this, W / 2 + 200, y0 + 140, 240, 96, 'ADD', C.star, async () => {
          try { const r = await Net.addFriend(el.value); if (!r.ok) throw new Error(r.error); A.win(); PS.emit('friendAdded', {}, this); this.scene.restart({ tab: 'friends' }); }
          catch (e) { A.block(); err(this, PS, e.message, y0 + 220); }
        }, { size: 40 });
        if (!list.length) { txt(this, W / 2, y0 + 300, 'No friends yet. Add one with their code!', 36, '#fff3d2', { st: 6 }); return; }
        // friend cards: picture + name on top, action buttons in a row below; pages when there are many
        const cols = PORTRAIT ? 1 : 2, cw = PORTRAIT ? W - 80 : (W - 120) / 2, ch = 230, top = y0 + 230;
        const rows = Math.max(1, Math.floor((H - top - 30) / (ch + 16))), per = rows * cols, pages = Math.ceil(list.length / per);
        this.page = Math.min(this.page || 0, pages - 1);
        const shown = list.slice(this.page * per, this.page * per + per);
        for (let i = 0; i < shown.length; i++) {
          const f = shown[i], x = W / 2 + (cols === 1 ? 0 : (i % 2 ? 1 : -1) * (cw / 2 + 10)), y = top + ch / 2 + Math.floor(i / cols) * (ch + 16);
          this.add.existing(X().card(this, PS, x, y, cw, ch));
          const key = await friendTex(this, PS, f.avatar);
          if (!this.sys.isActive()) return;
          avatarImg(this, PS, x - cw / 2 + 70, y - 50, key, 100);
          fit(txt(this, x - cw / 2 + 140, y - 72, f.username, 38, '#fff3d2', { st: 6, ox: 0 }), cw - 170);
          fit(txt(this, x - cw / 2 + 140, y - 28, f.title + ' · Lv ' + f.level + ' · ★ ' + f.stars, 24, '#ffd23f', { st: 4, ox: 0, weight: '500' }), cw - 170);
          const bw = (cw - 40 - 3 * 12) / 4, by = y + 55, bx0 = x - cw / 2 + 20 + bw / 2;
          button(this, bx0, by, bw, 76, 'DUEL', C.star, () => this.pickToy(f), { size: 28 });
          button(this, bx0 + (bw + 12), by, bw, 76, 'GIFT', C.mint, () => this.gift(f), { size: 28 });
          button(this, bx0 + 2 * (bw + 12), by, bw, 76, 'STICKER', C.cream, () => this.sticker(f), { size: 26 });
          button(this, bx0 + 3 * (bw + 12), by, bw, 76, 'REMOVE', C.night3, () => this.confirm('Remove ' + f.username + '?', async () => { await Net.removeFriend(f.id); this.scene.restart({ tab: 'friends' }); }), { size: 22, color: '#bcc0ee' });
        }
        if (pages > 1) {
          const py = Math.min(H - 40, top + rows * (ch + 16) + 10);
          txt(this, W / 2, py, (this.page + 1) + ' / ' + pages, 30, '#bcc0ee', { st: 5 });
          if (this.page > 0) button(this, W / 2 - 160, py, 120, 64, '◀', C.cream, () => { this.page--; this.scene.restart({ tab: 'friends' }); }, { size: 30 });
          if (this.page < pages - 1) button(this, W / 2 + 160, py, 120, 64, '▶', C.cream, () => { this.page++; this.scene.restart({ tab: 'friends' }); }, { size: 30 });
        }
      }
      overlay(title) {
        // DOM inputs float above the canvas: hide them while an overlay is open
        if (this.codeEl) this.codeEl.style.visibility = 'hidden';
        const lay = this.add.container(0, 0).setDepth(90);
        lay.once('destroy', () => { if (this.codeEl) this.codeEl.style.visibility = 'visible'; });
        const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x0f1240, 0.9).setInteractive(); lay.add(dim);
        lay.add(txt(this, W / 2, PORTRAIT ? 260 : 120, title, 52, '#ffd23f', { st: 8, wrap: W - 100 }));
        lay.add(button(this, W / 2, H - (PORTRAIT ? 120 : 80), 300, 96, 'CLOSE', C.cream, () => lay.destroy(true), { size: 36 }));
        return lay;
      }
      confirm(q, yes) {
        const lay = this.overlay(q);
        lay.add(button(this, W / 2, H / 2, 360, 110, 'YES', C.coral, () => { lay.destroy(true); yes(); }, { size: 40, color: '#fff3d2' }));
      }
      // duel a friend's toy (or their Jack)
      async pickToy(f) {
        const lay = this.overlay('Duel ' + f.username + '\'s squad');
        const toys = await Net.squad(f.id);
        const items = [{ jack: true }].concat(toys.map(t => ({ t })));
        const cols = PORTRAIT ? 3 : 5, cw = 260, ch = 280, top = PORTRAIT ? 400 : 230;
        items.slice(0, cols * 2).forEach(async (it, i) => {
          const x = W / 2 + ((i % cols) - (cols - 1) / 2) * (cw + 16), y = top + ch / 2 + Math.floor(i / cols) * (ch + 16);
          const c = this.add.container(x, y); lay.add(c);
          c.add(X().card(this, PS, 0, 0, cw, ch));
          let key = 'jack_front', name = f.username + '\'s Jack';
          if (it.t) { key = 'ftoy_' + it.t.meta.id; name = it.t.meta.name; if (!this.textures.exists(key)) await PS.addTexture(this, key, it.t.img); }
          if (this.textures.exists(key)) c.add(avatarImg(this, PS, 0, -30, key, 180));
          c.add(fit(txt(this, 0, ch / 2 - 40, name, 28, '#fff3d2', { st: 5 }), cw - 20));
          c.setSize(cw, ch).setInteractive({ useHandCursor: true }); PS.press(this, c);
          c.on('pointerup', () => {
            A.click();
            if (it.t) fade(this, 'battle', { ftoy: Object.assign({}, it.t.meta, { url: it.t.img, owner: f.id, dbid: it.t.id }), ownerName: f.username, ownerId: f.id });
            else fade(this, 'battle', { fjack: { level: f.level }, ownerName: f.username, ownerId: f.id });
          });
        });
      }
      gift(f) {
        const lay = this.overlay('Gift for ' + f.username);
        const d = Save.data;
        lay.add(button(this, W / 2, PORTRAIT ? 480 : 300, 600, 120, 'SEND A CAPSULE (free, 1 a day)', C.star, async () => {
          try { const r = await Net.send(f.id, 'gift_capsule', {}); if (!r.ok) throw new Error(r.error); A.win(); PS.emit('giftSent', {}, this); lay.destroy(true); X().toast(this, PS, 'j:gift', 'Capsule sent!', f.username + ' will find it in MAIL'); }
          catch (e) { A.block(); err(this, PS, e.message, PORTRAIT ? 580 : 380); }
        }, { size: 32 }));
        const owned = PS.BOOSTS.filter(b => (d.boosts[b.id] || 0) > 0);
        lay.add(txt(this, W / 2, PORTRAIT ? 640 : 420, owned.length ? 'or give one of your boosters:' : 'Open capsules to get boosters you can give', 30, '#bcc0ee', { st: 5, weight: '500' }));
        owned.slice(0, 8).forEach((b, i) => {
          const cols = PORTRAIT ? 3 : 5, x = W / 2 + ((i % cols) - (Math.min(cols, owned.length) - 1) / 2) * 230, y = (PORTRAIT ? 780 : 540) + Math.floor(i / cols) * 230;
          const c = this.add.container(x, y); lay.add(c);
          c.add(X().card(this, PS, 0, 0, 210, 210, C.cream, C.star));
          const ic = img(this, 0, -30, b.icon); ic.setScale(iconScale(b.icon, 100)); c.add(ic);
          c.add(fit(txt(this, 0, 60, b.name, 24, C.ink, { st: 0, shadow: false }), 190));
          c.add(chip(this, 80, -90, '×' + d.boosts[b.id], C.star, 20));
          c.setSize(210, 210).setInteractive({ useHandCursor: true }); PS.press(this, c);
          c.on('pointerup', async () => {
            try {
              const r = await Net.send(f.id, 'gift_boost', { boost: b.id }); if (!r.ok) throw new Error(r.error);
              d.boosts[b.id]--; if (d.boosts[b.id] <= 0) delete d.boosts[b.id]; Save.store();
              A.win(); PS.emit('giftSent', {}, this); lay.destroy(true); X().toast(this, PS, b.icon, b.name + ' sent!', f.username + ' will find it in MAIL');
            } catch (e) { A.block(); err(this, PS, e.message, H / 2); }
          });
        });
      }
      sticker(f) {
        const lay = this.overlay('Send ' + f.username + ' a sticker');
        STICKERS.forEach((s, i) => {
          const cols = 4, x = W / 2 + ((i % cols) - 1.5) * 230, y = (PORTRAIT ? 520 : 330) + Math.floor(i / cols) * 230;
          const c = this.add.container(x, y); lay.add(c);
          c.add(X().card(this, PS, 0, 0, 210, 210, C.cream, C.star));
          const ic = img(this, 0, -25, s.icon); ic.setScale(iconScale(s.icon, 110)); c.add(ic);
          c.add(fit(txt(this, 0, 70, s.label, 28, C.ink, { st: 0, shadow: false }), 190));
          c.setSize(210, 210).setInteractive({ useHandCursor: true }); PS.press(this, c);
          c.on('pointerup', async () => {
            try { const r = await Net.send(f.id, 'sticker', { s: s.id }); if (!r.ok) throw new Error(r.error); A.levelUp(); lay.destroy(true); X().toast(this, PS, s.icon, 'Sticker sent!', s.label + ' to ' + f.username); }
            catch (e) { A.block(); err(this, PS, e.message, H / 2); }
          });
        });
      }
      // --- mail
      async showMail() {
        const list = await Net.inbox(); this.clearLoading();
        if (!list.length) { txt(this, W / 2, H / 2, 'No new mail', 44, '#fff3d2', { st: 7 }); return; }
        // the 30 newest messages, a page at a time (QA B28 / #26)
        const w = Math.min(W - 80, 1100), h = 150, top = this.top + 40;
        const per = Math.max(1, Math.floor((H - top - 110) / (h + 14))), pages = Math.ceil(list.length / per);
        this.mailPage = Math.max(0, Math.min(this.mailPage || 0, pages - 1));
        if (pages > 1) {
          const py = top + per * (h + 14) + 40;
          txt(this, W / 2, py, (this.mailPage + 1) + ' / ' + pages, 30, '#bcc0ee', { st: 5 });
          if (this.mailPage > 0) button(this, W / 2 - 160, py, 120, 64, '◀', C.cream, () => this.scene.restart({ tab: 'mail', mailPage: this.mailPage - 1 }), { size: 30 });
          if (this.mailPage < pages - 1) button(this, W / 2 + 160, py, 120, 64, '▶', C.cream, () => this.scene.restart({ tab: 'mail', mailPage: this.mailPage + 1 }), { size: 30 });
        }
        list.slice(this.mailPage * per, this.mailPage * per + per).forEach((m, i) => {
          const y = top + h / 2 + i * (h + 14), from = m.from_name || 'A friend';
          this.add.existing(X().card(this, PS, W / 2, y, w, h));
          let icon = 'j:letter', text = '', act = null, actLabel = 'OK';
          if (m.kind === 'friend') { icon = 'j:friends'; text = from + ' added you as a friend!'; }
          else if (m.kind === 'sticker') { const s = STK[(m.payload || {}).s] || STICKERS[0]; icon = s.icon; text = from + ' sent you: ' + s.label; }
          else if (m.kind === 'gift_capsule') { icon = 'j:gift'; text = from + ' sent you a capsule!'; actLabel = 'OPEN'; act = () => { Save.data.caps++; Save.store(); }; }
          else if (m.kind === 'gift_boost') { const b = PS.BOOST_BY_ID[(m.payload || {}).boost]; icon = b ? b.icon : 'j:gift'; text = from + ' gave you ' + (b ? b.name : 'a booster') + '!'; actLabel = 'TAKE';
            act = () => { if (b) { Save.data.boosts[b.id] = (Save.data.boosts[b.id] || 0) + 1; Save.data.seen[b.id] = true; Save.store(); } }; }
          else if (m.kind === 'beat') { icon = 'j:cry'; text = from + ' beat your ' + ((m.payload || {}).toy || 'toy') + '! Revenge?'; actLabel = 'REVENGE!';
            act = () => this.revenge(m); }
          const ic = img(this, W / 2 - w / 2 + 80, y, icon); ic.setScale(iconScale(icon, 100));
          fit(txt(this, W / 2 - w / 2 + 150, y, text, 32, '#fff3d2', { st: 5, ox: 0 }), w - 470);
          button(this, W / 2 + w / 2 - 140, y, 230, 90, actLabel, act ? C.star : C.cream, async () => {
            const r = await Net.claim(m.id); if (!r) return this.scene.restart({ tab: 'mail', mailPage: this.mailPage });
            A.win(); if (act) act();
            if (m.kind !== 'beat') this.scene.restart({ tab: 'mail', mailPage: this.mailPage });
          }, { size: 30 });
        });
      }
      async revenge(m) {
        // duel the sender's hero (their toy or their Jack)
        const fr = (await Net.friends()).find(f => f.id === m.from_user);
        if (!fr) return this.scene.restart({ tab: 'mail' });
        const av = fr.avatar || {};
        if (av.hero && av.hero !== 'jack' && av.img) {
          const toys = await Net.squad(fr.id), t = toys.find(x => x.meta.id === av.hero);
          if (t) { await PS.addTexture(this, 'ftoy_' + t.meta.id, t.img); return fade(this, 'battle', { ftoy: Object.assign({}, t.meta, { url: t.img, owner: fr.id, dbid: t.id }), ownerName: fr.username, ownerId: fr.id }); }
        }
        fade(this, 'battle', { fjack: { level: fr.level }, ownerName: fr.username, ownerId: fr.id });
      }
      // --- museum
      async showMuseum() {
        const list = await Net.museum(); this.clearLoading();
        if (!list.length) { txt(this, W / 2, H / 2, 'Add toys with + ADD A TOY to fill the museum!', 40, '#fff3d2', { st: 7, wrap: W - 120 }); return; }
        const cols = PORTRAIT ? 3 : 6, cw = Math.min(300, (W - 80) / cols - 16), ch = cw + 90, top = this.top + 30;
        const maxRows = Math.floor((H - top - 40) / (ch + 16));
        list.slice(0, cols * maxRows).forEach(async (t, i) => {
          const x = W / 2 + ((i % cols) - (cols - 1) / 2) * (cw + 16), y = top + ch / 2 + Math.floor(i / cols) * (ch + 16);
          const c = this.add.container(x, y);
          c.add(X().card(this, PS, 0, 0, cw, ch, t.owner === Net.user.id ? 0x2e3488 : C.night2));
          const key = 'mtoy_' + t.id.replace(/[^a-z0-9]/gi, '');
          if (this.textures.exists(key) || await PS.addTexture(this, key, t.img)) { if (!this.sys.isActive()) return; c.add(avatarImg(this, PS, 0, -40, key, cw - 50)); }
          c.add(fit(txt(this, 0, ch / 2 - 70, t.meta.name, 26, '#fff3d2', { st: 5 }), cw - 20));
          c.add(fit(txt(this, -cw / 2 + 16, ch / 2 - 30, 'by ' + t.username, 20, '#bcc0ee', { st: 0, shadow: false, ox: 0, weight: '500' }), cw - 100));
          const heart = img(this, cw / 2 - 50, ch / 2 - 30, 'j:heart2'); heart.setScale(iconScale('j:heart2', 40)); if (!t.liked) heart.setAlpha(0.35);
          const cnt = txt(this, cw / 2 - 22, ch / 2 - 30, String(t.likes), 24, '#fff3d2', { st: 4, ox: 0 });
          c.add([heart, cnt]);
          c.setSize(cw, ch).setInteractive({ useHandCursor: true }); PS.press(this, c, 0.96);
          c.on('pointerup', async () => { A.click(); t.liked = !t.liked; heart.setAlpha(t.liked ? 1 : 0.35); this.tweens.add({ targets: heart, scale: heart.scale * 1.4, duration: 120, yoyo: true }); cnt.setText(String(await Net.like(t.id))); });
        });
      }
      // --- top catch (friends only, this week)
      async showTop() {
        const list = await Net.board(); this.clearLoading();
        txt(this, W / 2, this.top + 40, 'Star Catch this week (you + friends)', 34, '#bcc0ee', { st: 5, weight: '500' });
        if (!list.length) { txt(this, W / 2, H / 2, 'Play Star Catch to get on the board!', 40, '#fff3d2', { st: 7 }); return; }
        const w = Math.min(W - 80, 900), h = 100, top = this.top + 100;
        list.slice(0, PORTRAIT ? 12 : 7).forEach((r, i) => {
          const y = top + h / 2 + i * (h + 10);
          this.add.existing(X().card(this, PS, W / 2, y, w, h, r.me ? 0x2e3488 : C.night2, i === 0 ? C.star : C.seam));
          txt(this, W / 2 - w / 2 + 60, y, String(i + 1), 44, i === 0 ? '#ffd23f' : '#fff3d2', { st: 6 });
          if (i === 0) { const cr = this.add.image(W / 2 - w / 2 + 60, y - 44, 'crown').setScale(0.18); }
          fit(txt(this, W / 2 - w / 2 + 130, y, r.username + (r.me ? ' (you)' : ''), 36, '#fff3d2', { st: 5, ox: 0 }), w - 360);
          txt(this, W / 2 + w / 2 - 50, y, '★ ' + r.score, 40, '#ffd23f', { st: 6, ox: 1 });
        });
      }
    }

    // ---------- weekly co-op boss panel (opened from the map)
    class BossScene extends Phaser.Scene {
      constructor() { super('boss'); }
      create() {
        X().header(this, PS, 'WEEKLY BOSS', 'map');
        const k = this.add.image(W / 2, PORTRAIT ? 620 : 380, 'kraken').setScale(PORTRAIT ? 1.6 : 1.3);
        this.tweens.add({ targets: k, y: k.y - 24, angle: { from: -4, to: 4 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        this.info = txt(this, W / 2, PORTRAIT ? 900 : 620, 'Loading...', 36, '#fff3d2', { st: 6 });
        // a late answer from before a RETRY (or from a destroyed game) must not draw on this screen
        const tok = this._tok = {}, live = () => this._tok === tok && this.sys.isActive();
        Net.bossStatus().then(b => live() && this.show(b), e => { console.warn('boss', e); if (live()) this.fail(); });
      }
      // the server call failed (offline or an RPC error): say so, with RETRY and BACK (QA B23 / #22)
      fail() {
        const y = PORTRAIT ? 900 : 620;
        this.info.setText('The Kraken is hiding! Could not reach the server.').setWordWrapWidth(Math.min(W - 120, 900));
        button(this, W / 2 - 220, y + 150, 380, 120, 'RETRY', C.star, () => this.scene.restart(), { size: 44 });
        button(this, W / 2 + 220, y + 150, 380, 120, 'BACK', C.cream, () => fade(this, 'map'), { size: 44 });
      }
      show(b) {
        this.info.destroy();
        const y = PORTRAIT ? 880 : 600, bw = Math.min(W - 160, 900), left = Math.max(0, b.max_hp - b.dmg);
        txt(this, W / 2, y - 70, b.name + ': ' + left + ' / ' + b.max_hp + ' pep left', 40, '#fff3d2', { st: 6 });
        this.add.rectangle(W / 2, y, bw, 44, 0x0f1240).setStrokeStyle(4, C.seam);
        this.add.rectangle(W / 2 - bw / 2 + 4, y, Math.max(0, (bw - 8) * left / b.max_hp), 34, 0xff9ed8).setOrigin(0, 0.5);
        txt(this, W / 2, y + 70, 'Everyone in Plush Squad hits the same Kraken this week. Your hits: ' + b.my_dmg, 28, '#bcc0ee', { st: 5, weight: '500', wrap: bw });
        const by = y + (PORTRAIT ? 220 : 180);
        if (left <= 0) {
          if (b.claimed) txt(this, W / 2, by, 'Defeated! You got your reward. New Kraken next week!', 34, '#7fe39a', { st: 6, wrap: bw });
          else if (b.my_dmg > 0) button(this, W / 2, by, 560, 120, 'CLAIM GOLDEN CAPSULE', C.star, async () => { if (await Net.bossClaim()) { Save.data.goldCaps = (Save.data.goldCaps || 0) + 1; Save.store(); A.win(); this.scene.restart(); } }, { size: 36 });
          else txt(this, W / 2, by, 'The Kraken is beaten! Join the fight next week.', 34, '#fff3d2', { st: 6 });
        } else if (b.tries_left > 0) {
          button(this, W / 2, by, 460, 130, 'FIGHT! (' + b.tries_left + ' left today)', C.star, async () => { if (await Net.bossStart()) fade(this, 'battle', { boss: true }); else this.scene.restart(); }, { size: 38 });
        } else txt(this, W / 2, by, 'No more fights today. Come back tomorrow!', 36, '#fff3d2', { st: 6 });
        txt(this, W / 2, by + 110, 'When the Kraken is beaten, everyone who hit it gets a GOLDEN capsule (super rare)', 26, '#bcc0ee', { st: 5, weight: '500', wrap: bw });
      }
    }
    return [AccountScene, FriendsScene, BossScene];
  }

  // map extras: the boss button, mail popups
  function mapExtras(scene, PS) {
    const { W, PORTRAIT, C, img, iconScale, txt, A, fade } = PS;
    const x = PORTRAIT ? W - 320 : W - 80, y = PORTRAIT ? 80 : 200;
    const c = scene.add.container(x, y).setDepth(50);
    c.add(scene.add.circle(0, 0, 46, 0xff9ed8).setStrokeStyle(4, 0xffffff));
    const k = scene.add.image(0, 0, 'kraken').setScale(70 / 235); c.add(k);
    c.add(txt(scene, 0, 60, 'BOSS', 22, '#fff3d2', { st: 5 }));
    scene.tweens.add({ targets: k, angle: { from: -10, to: 10 }, duration: 700, yoyo: true, repeat: -1 });
    c.setSize(100, 100).setInteractive({ useHandCursor: true }); PS.press(scene, c, 0.88);
    c.on('pointerup', () => { A.init(); A.click(); fade(scene, 'boss'); });
  }
  async function mailPopup(scene, PS) {
    if (Date.now() - Net._lastInbox < 30000) return;
    try {
      const list = await Net.inbox();
      if (list.length && scene.sys.isActive() && window.PSExtra) {
        const c = window.PSExtra.toast(scene, PS, 'j:mail', 'You have ' + list.length + ' new message' + (list.length > 1 ? 's' : '') + '!', 'Tap here to open MAIL');
        c.setSize(820, 150).setInteractive({ useHandCursor: true }); PS.press(scene, c, 0.96);
        c.on('pointerup', () => PS.fade(scene, 'friends', { tab: 'mail' }));
      }
    } catch (e) {}
  }

  function onEvent(name, d, scene, PS) {
    if (!Net.ready || !Net.user) return;
    if (name === 'toyAdded') Net.uploadToy(d.toy, d.url);
    if (name === 'catch') Net.submitCatch(d.score);
    if (name === 'duel') {
      if (d.mode === 'friend' && d.won && d.data && d.data.ownerId)
        Net.send(d.data.ownerId, 'beat', { toy: d.data.ftoy ? d.data.ftoy.name : 'Jack', toyId: d.data.ftoy ? d.data.ftoy.id : 'jack' }).catch(() => {});
      if (d.mode === 'boss') Net.bossHit(d.dmg).catch(() => {});
    }
    if (name === 'scene') {
      if (d.key === 'map') mapExtras(scene, PS);
      if (d.key === 'title' || d.key === 'map') mailPopup(scene, PS);
    }
  }

  (window.PSPlugins = window.PSPlugins || []).push({
    name: 'net',
    nav: CFG.url ? [{ key: 'friends', label: 'FRIENDS', icon: 'j:friends', order: 2, badge: () => Net.unread }] : [],
    scenes, onEvent,
  });
  window.PSNetReady = Net.init();
})();
