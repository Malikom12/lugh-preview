(function () {
  'use strict';

  /* Practice details. Update opening hours, holidays and phone numbers here.
     Hours are minutes from midnight; weekday 0 is Sunday. */
  var PRACTICE = {
    phone: '042 932 7466',
    tel: '+353429327466',
    weekendOOH: { name: 'Dealgan Doc', phone: '086 813 5511', tel: '+353868135511' },
    hours: {
      0: [],
      1: [[570, 750], [870, 1050]],
      2: [[570, 750], [870, 1050]],
      3: [[570, 750], [960, 1050]],
      4: [[570, 750], [870, 1050]],
      5: [[570, 750], [870, 1050]],
      6: []
    },
    // Irish public holidays. Add any extra practice closures here too.
    holidays: {
      '2026-01-01': 'New Year’s Day', '2026-02-02': 'St Brigid’s Day', '2026-03-17': 'St Patrick’s Day',
      '2026-04-06': 'Easter Monday', '2026-05-04': 'May bank holiday', '2026-06-01': 'June bank holiday',
      '2026-08-03': 'August bank holiday', '2026-10-26': 'October bank holiday',
      '2026-12-25': 'Christmas Day', '2026-12-26': 'St Stephen’s Day',
      '2027-01-01': 'New Year’s Day', '2027-02-01': 'St Brigid’s Day', '2027-03-17': 'St Patrick’s Day',
      '2027-03-29': 'Easter Monday', '2027-05-03': 'May bank holiday', '2027-06-07': 'June bank holiday',
      '2027-08-02': 'August bank holiday', '2027-10-25': 'October bank holiday',
      '2027-12-25': 'Christmas Day', '2027-12-26': 'St Stephen’s Day'
    },
    lat: 53.98654,
    lon: -6.39464,
    tz: 'Europe/Dublin'
  };

  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Dublin time */
  var dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone: PRACTICE.tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short'
  });

  function partsAt(date) {
    var o = {};
    dtf.formatToParts(date).forEach(function (p) { o[p.type] = p.value; });
    return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, wd: WD[o.weekday] };
  }

  function dublinLocalToDate(iso) {
    var dt = iso.split('T'), d = dt[0].split('-').map(Number), t = dt[1].split(':').map(Number);
    var guess = Date.UTC(d[0], d[1] - 1, d[2], t[0], t[1]);
    var p = partsAt(new Date(guess));
    var offset = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi) - guess;
    return new Date(guess - offset);
  }

  // Add ?at=2026-12-25T10:00 to the address to see the site at another time (Dublin time)
  var previewISO = (function () {
    var at = new URLSearchParams(location.search).get('at');
    return at && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(at) ? at : null;
  })();
  function now() { return previewISO ? dublinLocalToDate(previewISO) : new Date(); }

  function key(y, m, d) { return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }
  function addDays(y, m, d, n) {
    var t = new Date(Date.UTC(y, m - 1, d + n));
    return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), wd: t.getUTCDay() };
  }
  function sessionsOn(day) { return PRACTICE.holidays[key(day.y, day.m, day.d)] ? [] : (PRACTICE.hours[day.wd] || []); }

  function fmtMins(m) {
    var h = Math.floor(m / 60), mi = m % 60;
    return (((h + 11) % 12) + 1) + (mi ? '.' + String(mi).padStart(2, '0') : '') + (h >= 12 ? 'pm' : 'am');
  }
  function fmtSessions(s, joiner) {
    return s.map(function (x) { return fmtMins(x[0]) + ' to ' + fmtMins(x[1]); }).join(joiner || ' and ');
  }
  function holidayPhrase(name) { return /bank holiday/.test(name) ? 'the ' + name : name; }

  function nextOpening(from) {
    for (var i = 1; i <= 30; i++) {
      var n = addDays(from.y, from.m, from.d, i), s = sessionsOn(n);
      if (s.length) { n.start = s[0][0]; n.offset = i; return n; }
    }
    return null;
  }
  function whenPhrase(n) {
    if (!n) return 'soon';
    if (n.offset === 1) return 'tomorrow';
    if (n.offset <= 6) return 'on ' + DAYS[n.wd];
    return 'on ' + DAYS[n.wd] + ' ' + n.d + ' ' + MONTHS[n.m - 1];
  }

  function getStatus(date) {
    var p = partsAt(date), mins = p.h * 60 + p.mi;
    var holiday = PRACTICE.holidays[key(p.y, p.m, p.d)] || null;
    var today = holiday ? [] : (PRACTICE.hours[p.wd] || []);
    var weekendish = !!holiday || p.wd === 0 || p.wd === 6;
    var st = { p: p, mins: mins, holiday: holiday, today: today, weekendish: weekendish, next: nextOpening(p) };
    var cur = today.filter(function (s) { return mins >= s[0] && mins < s[1]; })[0];
    if (cur) {
      st.state = cur[1] - mins <= 30 ? 'soon' : 'open';
      st.closesAt = cur[1];
      st.later = today.filter(function (s) { return s[0] >= cur[1]; })[0] || null;
      return st;
    }
    var later = today.filter(function (s) { return s[0] > mins; })[0];
    if (later) {
      st.state = today.some(function (s) { return s[1] <= mins; }) ? 'between' : 'later';
      st.opensAt = later[0];
      return st;
    }
    st.state = 'closed';
    return st;
  }

  /* Opening status */
  function renderStatus() {
    var st = getStatus(now());
    var head, detail, dot;
    if (st.state === 'open') {
      dot = 'open'; head = 'Open now';
      detail = 'until ' + fmtMins(st.closesAt) + (st.later ? ', then ' + fmtMins(st.later[0]) + ' to ' + fmtMins(st.later[1]) : '');
    } else if (st.state === 'soon') {
      dot = 'soon'; head = 'Closing soon';
      detail = 'We close at ' + fmtMins(st.closesAt) + (st.later
        ? ' and open again at ' + fmtMins(st.later[0]) + '.'
        : '. We open again ' + whenPhrase(st.next) + ' at ' + fmtMins(st.next.start) + '.');
    } else if (st.state === 'between') {
      dot = 'lunch'; head = 'Closed now';
      detail = 'We open again at ' + fmtMins(st.opensAt) + ' today.';
    } else if (st.state === 'later') {
      dot = 'later'; head = 'Closed now';
      detail = 'We open today at ' + fmtMins(st.opensAt) + '.';
    } else {
      dot = 'closed'; head = st.holiday ? 'Closed today' : 'Closed now';
      detail = (st.holiday ? 'We’re closed for ' + holidayPhrase(st.holiday) + '. ' : '') +
        'We open ' + whenPhrase(st.next) + ' at ' + fmtMins(st.next.start) + '.';
    }

    var dotEl = $('#plate-dot');
    if (dotEl) dotEl.className = 'dot dot--' + dot;
    setText('#plate-headline', head);
    setText('#plate-detail', detail);

    var todayEl = $('#plate-today');
    if (todayEl) {
      todayEl.innerHTML = '<strong>Today</strong> ' + (st.holiday ? 'Closed for ' + holidayPhrase(st.holiday)
        : st.today.length ? fmtSessions(st.today) : 'Closed');
    }

    // After hours, show who to call
    var urgent = $('#plate-urgent');
    var showUrgent = st.state === 'closed' || st.state === 'later';
    if (urgent) {
      urgent.hidden = !showUrgent;
      if (showUrgent) {
        var w = PRACTICE.weekendOOH;
        var weekend = st.weekendish && st.state === 'closed';
        urgent.innerHTML = weekend
          ? 'Need a doctor urgently? Phone ' + w.name + ' on <a href="tel:' + w.tel + '">' + w.phone + '</a>. In an emergency, call <a href="tel:112">112</a> or <a href="tel:999">999</a>.'
          : 'Need a doctor before then? Phone <a href="tel:' + PRACTICE.tel + '">' + PRACTICE.phone + '</a> and our message gives you the doctor on call. In an emergency, call <a href="tel:112">112</a> or <a href="tel:999">999</a>.';
      }
    }

    // Sidebar status
    var mini;
    if (st.state === 'open') mini = 'Open until ' + fmtMins(st.closesAt);
    else if (st.state === 'soon') mini = 'Closing at ' + fmtMins(st.closesAt);
    else if (st.state === 'between' || st.state === 'later') mini = 'Closed until ' + fmtMins(st.opensAt);
    else mini = 'Closed. Opens ' + whenPhrase(st.next).replace(/^on /, '') + ' at ' + fmtMins(st.next.start);
    $$('[data-mini-status]').forEach(function (el) {
      el.querySelector('.dot').className = 'dot dot--' + dot;
      el.querySelector('span:last-child').textContent = mini;
    });

    // Mobile action bar: "Hours" while open, "Closed? Get help" otherwise
    var third = $('#actionbar-third');
    if (third) {
      var isOpen = st.state === 'open' || st.state === 'soon';
      third.href = isOpen ? '#hours' : '#closed';
      third.classList.toggle('is-urgent', !isOpen);
      third.querySelector('span').textContent = isOpen ? 'Hours' : 'Closed? Get help';
      third.querySelector('use').setAttribute('href', isOpen ? '#i-clock' : '#i-moon');
    }

    // When closed, move the help ladder above the task list
    var flow = $('#home-flow'), tasks = $('#home-tasks'), help = $('#home-help');
    if (flow && tasks && help) {
      var closedish = st.state === 'closed' || st.state === 'later';
      if (closedish && flow.firstElementChild !== help) flow.insertBefore(help, tasks);
      if (!closedish && flow.firstElementChild !== tasks) flow.insertBefore(tasks, help);
      help.classList.toggle('section--lead', closedish);
    }

    renderHours(st);
    renderHolidayNotes(st);
  }

  function setText(sel, t) { var el = $(sel); if (el && el.textContent !== t) el.textContent = t; }

  function renderHours(st) {
    var body = $('#hours-body');
    if (!body) return;
    var order = [1, 2, 3, 4, 5, 6, 0];
    body.innerHTML = order.map(function (wd) {
      var s = PRACTICE.hours[wd];
      var isToday = wd === st.p.wd;
      var txt = s.length ? s.map(function (x) { return '<span class="nowrap">' + fmtMins(x[0]) + ' to ' + fmtMins(x[1]) + '</span>'; }).join('<br>') : 'Closed';
      if (isToday && st.holiday) txt = 'Closed today for ' + holidayPhrase(st.holiday);
      return '<tr' + (isToday ? ' class="is-today"' : '') + '><th scope="row">' + DAYS[wd] + '</th><td>' + txt + '</td></tr>';
    }).join('');
  }

  function upcomingHolidays(st, withinDays) {
    var out = [];
    for (var i = 0; i <= withinDays; i++) {
      var n = addDays(st.p.y, st.p.m, st.p.d, i), name = PRACTICE.holidays[key(n.y, n.m, n.d)];
      if (name) { n.name = name; n.offset = i; out.push(n); }
    }
    return out;
  }
  function dateLabel(n) { return DAYS[n.wd] + ' ' + n.d + ' ' + MONTHS[n.m - 1]; }

  function renderHolidayNotes(st) {
    var all = upcomingHolidays(st, 366);
    var nh = $('#next-holiday');
    if (nh && all.length) {
      nh.textContent = 'Closed on public holidays. Next: ' + all[0].name + ', ' + dateLabel(all[0]) + '.';
    }
    var list = $('#notices');
    if (!list) return;
    var old = $('#holiday-notice');
    if (old) old.remove();
    var soon = all.filter(function (h) { return h.offset <= 30; });
    if (!soon.length) return;
    // Group consecutive days (e.g. Christmas Day and St Stephen's Day)
    var group = [soon[0]];
    for (var i = 1; i < soon.length && soon[i].offset === group[group.length - 1].offset + 1; i++) group.push(soon[i]);
    var names = group.map(function (h) { return h.name; }).join(' and ');
    var dates = group.map(dateLabel).join(' and ');
    var li = document.createElement('li');
    li.className = 'notice';
    li.id = 'holiday-notice';
    li.innerHTML = '<svg class="i" aria-hidden="true"><use href="#i-calendar"/></svg><div><p class="notice__when">' +
      (group[0].offset === 0 ? 'Today' : 'Coming up') + '</p><h3>Closed for ' + names + '</h3><p>' + dates +
      '. If you need a doctor urgently, phone ' + PRACTICE.weekendOOH.name + ' on <a href="tel:' + PRACTICE.weekendOOH.tel + '">' +
      PRACTICE.weekendOOH.phone + '</a>. Order repeat prescriptions a week before.</p></div>';
    list.insertBefore(li, list.firstChild);
  }

  /* Sky and sun */
  var RAD = Math.PI / 180;
  function toJ(ms) { return ms / 86400000 + 2440587.5; }
  function fromJ(j) { return (j - 2440587.5) * 86400000; }

  function solarDay(p) {
    var n = Math.round(toJ(Date.UTC(p.y, p.m - 1, p.d, 12)) - 2451545.0);
    var Js = n - PRACTICE.lon / 360;
    var M = ((357.5291 + 0.98560028 * Js) % 360 + 360) % 360;
    var C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
    var L = (M + C + 180 + 102.9372) % 360;
    var Jt = 2451545.0 + Js + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * L * RAD);
    var dec = Math.asin(Math.sin(L * RAD) * Math.sin(23.4397 * RAD));
    var phi = PRACTICE.lat * RAD;
    var cosW = (Math.sin(-0.833 * RAD) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
    var w0 = Math.acos(Math.max(-1, Math.min(1, cosW))) / RAD;
    return { transit: fromJ(Jt), rise: fromJ(Jt - w0 / 360), set: fromJ(Jt + w0 / 360), dec: dec, Jt: Jt };
  }
  function elevation(ms, sd) {
    var H = ((toJ(ms) - sd.Jt) * 360) % 360;
    if (H > 180) H -= 360;
    if (H < -180) H += 360;
    var phi = PRACTICE.lat * RAD;
    return Math.asin(Math.sin(phi) * Math.sin(sd.dec) + Math.cos(phi) * Math.cos(sd.dec) * Math.cos(H * RAD)) / RAD;
  }
  function fmtClock(ms) { var p = partsAt(new Date(ms)); return fmtMins(p.h * 60 + p.mi); }

  var firstSun = true;
  var wideMQ = window.matchMedia('(min-width: 960px)');

  var HORIZON = 300;

  function renderSky() {
    var win = $('#window'), svg = $('#scene'), sun = $('#sun-g'), glint = $('#glint');
    if (!win || !svg || !sun || !win.offsetParent) return;
    var t = now().getTime(), sd = solarDay(partsAt(new Date(t))), e = elevation(t, sd);

    var phase = e < -6 ? 'night' : e < 4 ? (t < sd.transit ? 'dawn' : 'dusk') : 'day';
    if (win.dataset.phase !== phase) win.dataset.phase = phase;

    // Phones show a closer crop of the scene
    var vb = wideMQ.matches ? [0, 0, 1440, 400] : [300, 40, 1040, 360];
    var vbStr = vb.join(' ');
    if (svg.getAttribute('viewBox') !== vbStr) svg.setAttribute('viewBox', vbStr);

    // Matches preserveAspectRatio="xMidYMax meet"
    var box = svg.getBoundingClientRect();
    var w = box.width || 1, h = box.height || 1;
    var s = Math.min(w / vb[2], h / vb[3]);
    var offY = h - vb[3] * s;
    var unitsY = function (screenY) { return vb[1] + (screenY - box.top - offY) / s; };

    // Keep the sun below the headline and status panel
    var blocker = wideMQ.matches ? $('.hero__plate') : $('.hero__title');
    var r = Math.max(34, 15 / s);
    var topLimit = blocker ? unitsY(blocker.getBoundingClientRect().bottom) + r + 14 : 120;
    var maxRise = Math.max(36, HORIZON - topLimit);

    // Sun path over the open water
    var left = 960, right = vb[0] + vb[2] - r - 30;
    var f = Math.max(0, Math.min(1, (t - sd.rise) / (sd.set - sd.rise)));
    var x = left + f * (right - left);
    var y = HORIZON - (Math.max(e, -6) / 62) * maxRise;
    $('#sun').setAttribute('r', r.toFixed(1));
    var halo = $('#sun-halo');
    if (halo) halo.setAttribute('r', (r * 2.7).toFixed(1));
    var target = 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')';

    if (firstSun && !reduceMotion && e > -1) {
      sun.style.transition = 'none';
      sun.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + (HORIZON + r + 12).toFixed(1) + ')');
      sun.getBoundingClientRect();
      requestAnimationFrame(function () { sun.style.transition = ''; sun.setAttribute('transform', target); });
    } else {
      sun.setAttribute('transform', target);
    }
    firstSun = false;
    sun.style.opacity = e < -2 ? '0' : '1';
    if (glint) {
      glint.setAttribute('transform', 'translate(' + x.toFixed(1) + ' 0)');
      glint.setAttribute('opacity', e > 0 ? Math.min(0.85, e / 8).toFixed(2) : '0');
    }

    var cap = $('#scene-caption');
    if (cap) {
      var txt = 'Sunrise ' + fmtClock(sd.rise) + ', sunset ' + fmtClock(sd.set);
      cap.textContent = wideMQ.matches ? 'Today in Dundalk: ' + txt.charAt(0).toLowerCase() + txt.slice(1) : txt;
    }
  }

  /* Pages */
  var pages = $$('.page');
  var firstRoute = true;

  // A short fade when moving between pages (not on first load)
  function enter(page) {
    var done = function () { page.classList.remove('is-entering'); };
    page.classList.add('is-entering');
    page.addEventListener('animationend', done, { once: true });
    page.addEventListener('animationcancel', done, { once: true });
  }

  function route() {
    var id = decodeURIComponent(location.hash.slice(1)) || 'home';
    var target = document.getElementById(id);
    var page = target ? (target.classList.contains('page') ? target : target.closest('.page')) : null;

    if (target && !page) {
      // e.g. the skip link: keep the current page and move focus
      if (!$('.page.is-active')) $('#home').classList.add('is-active');
      target.focus();
      return;
    }
    if (!page) { page = $('#home'); target = null; }

    if (!firstRoute && !reduceMotion && page !== $('.page.is-active')) enter(page);
    pages.forEach(function (p) { p.classList.toggle('is-active', p === page); });
    document.title = page.getAttribute('data-title');
    $$('.nav a, .menu-link').forEach(function (a) {
      if (a.getAttribute('href') === '#' + page.id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    setMenu(false);

    if (target && target !== page) {
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.scrollIntoView({ block: 'start' });
      target.focus({ preventScroll: true });
    } else {
      window.scrollTo(0, 0);
      if (!firstRoute) {
        var h1 = page.querySelector('h1');
        if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
      }
    }
    firstRoute = false;
    renderSky();
  }

  /* Header */
  var menuBtn = $('#menu-btn'), menuPanel = $('#menu-panel');
  function setMenu(open) {
    if (!menuBtn) return;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuPanel.hidden = !open;
    menuBtn.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
    menuBtn.lastChild.textContent = open ? 'Close' : 'Menu';
  }
  if (menuBtn) {
    menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
    });
  }

  function setTextSize(v) {
    document.documentElement.dataset.textsize = v;
    try { localStorage.setItem('lugh-textsize', v); } catch (e) { /* storage unavailable */ }
    $$('button[data-textsize]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-textsize') === v)); });
    renderSky();
  }
  $$('button[data-textsize]').forEach(function (b) {
    b.addEventListener('click', function () { setTextSize(b.getAttribute('data-textsize')); });
  });
  setTextSize(document.documentElement.dataset.textsize || '0');

  var masthead = $('#masthead'), ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      if (masthead) masthead.classList.toggle('is-stuck', masthead.getBoundingClientRect().top <= 0 && window.scrollY > 40);
      ticking = false;
    });
  }, { passive: true });

  /* Dialogs */
  var lastOpener = null;
  function openDialog(id, opener) {
    var d = document.getElementById(id);
    if (!d || typeof d.showModal !== 'function') return;
    lastOpener = opener || document.activeElement;
    if (id === 'dlg-rx') resetRx();
    d.showModal();
  }
  $$('[data-open]').forEach(function (b) {
    b.addEventListener('click', function () { openDialog(b.getAttribute('data-open'), b); });
  });
  $$('dialog').forEach(function (d) {
    d.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) d.close();
      else if (e.target === d) d.close();
    });
    d.addEventListener('close', function () { if (lastOpener && lastOpener.focus) lastOpener.focus(); });
  });

  /* Free GP care checker */
  var checker = $('#checker-form');
  if (checker) {
    checker.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var field = $('#age-field'), err = $('#age-error'), input = $('#age');
      var raw = input.value.trim(), age = Number(raw);
      var ok = raw !== '' && Number.isInteger(age) && age >= 0 && age <= 120;
      field.classList.toggle('has-error', !ok);
      err.hidden = ok;
      input.setAttribute('aria-invalid', String(!ok));
      input.setAttribute('aria-describedby', ok ? 'age-hint' : 'age-hint age-error');
      if (!ok) {
        err.textContent = 'Enter an age between 0 and 120, in whole years';
        $('#checker-result').innerHTML = '';
        input.focus();
        return;
      }
      var card = (checker.querySelector('input[name="card"]:checked') || {}).value || 'none';
      var r = [];
      if (card === 'medical') r.push([1, 'GP visits are free with a medical card. Prescription charges may apply at the pharmacy.']);
      else if (card === 'gpvisit') r.push([1, 'GP visits are free with a GP visit card. Medicines aren’t covered.']);
      else if (age < 8) r.push([1, 'GP visits are free for children under 8 with an under-8s GP visit card. There’s no means test. Register at hse.ie.']);
      else if (age >= 70) r.push([1, 'GP visits are free for everyone aged 70 or over with a GP visit card, whatever your income. Apply at hse.ie if you don’t have one.']);
      else {
        r.push([0, 'GP visits are private. Phone us for our current consultation fee.']);
        r.push([0, 'You may qualify for a GP visit card. Income limits went up in 2023, so check at hse.ie.']);
      }
      if (card === 'unsure') r.push([0, 'Not sure? Medical cards and GP visit cards show the name of your GP. Bring yours, or ask us when you phone.']);
      if (age <= 1) r.push([1, 'Childhood vaccines on the HSE schedule are free.']);
      if (age >= 2 && age <= 17) r.push([1, 'The children’s flu vaccine, a nasal spray, is free this winter.']);
      if (age >= 60) r.push([1, 'The flu vaccine is free this winter for everyone aged 60 and over.']);
      if (age >= 65) r.push([1, 'The pneumococcal vaccine is free for people aged 65 and over.']);
      if (age >= 17 && age <= 35) r.push([1, 'Contraception appointments and prescriptions are free under the Free Contraception Scheme.']);
      if (age >= 25 && age <= 65) r.push([1, 'Cervical screening is free with CervicalCheck, for women and people with a cervix.']);
      if (age >= 16 && age <= 50) r.push([1, 'If you’re pregnant, your pregnancy visits are free under the Maternity and Infant Care Scheme.']);

      $('#checker-result').innerHTML = '<h3>For a patient aged ' + age + '</h3><ul class="result-list">' +
        r.map(function (x) { return '<li class="' + (x[0] ? 'is-free' : '') + '">' + x[1] + '</li>'; }).join('') + '</ul>';
    });
  }

  /* Repeat prescription form (demo, nothing is sent) */
  var rxTemplate = $('#rx-body') ? $('#rx-body').innerHTML : '';
  function resetRx() {
    var body = $('#rx-body');
    if (!body) return;
    body.innerHTML = rxTemplate;
    $('#rx-form').addEventListener('submit', submitRx);
  }
  function fieldError(id, msg, focusId) {
    var f = document.getElementById(id), e = f.querySelector('.error');
    f.classList.toggle('has-error', !!msg);
    e.hidden = !msg;
    e.textContent = msg ? msg : '';
    if (msg) e.id = id + '-err';
    return msg ? { msg: msg, href: '#' + focusId } : null;
  }
  function submitRx(ev) {
    ev.preventDefault();
    var v = function (id) { return (document.getElementById(id).value || '').trim(); };
    var errs = [];
    var push = function (x) { if (x) errs.push(x); };

    push(fieldError('f-name', v('rx-name') ? '' : 'Enter your full name', 'rx-name'));

    var dd = +v('rx-dd'), mm = +v('rx-mm'), yy = +v('rx-yy'), dobMsg = '';
    if (!v('rx-dd') || !v('rx-mm') || !v('rx-yy')) dobMsg = 'Enter your date of birth, for example 27 3 1958';
    else {
      var dt = new Date(Date.UTC(yy, mm - 1, dd));
      if (!(dt.getUTCFullYear() === yy && dt.getUTCMonth() === mm - 1 && dt.getUTCDate() === dd) || yy < 1900) dobMsg = 'Date of birth must be a real date';
      else if (dt.getTime() > Date.now()) dobMsg = 'Date of birth must be in the past';
    }
    push(fieldError('f-dob', dobMsg, 'rx-dd'));

    var tel = v('rx-tel').replace(/[\s()-]/g, '');
    push(fieldError('f-tel', !tel ? 'Enter a mobile number, like 087 123 4567' : (/^\+?\d{9,13}$/.test(tel) ? '' : 'Enter a mobile number in the right format, like 087 123 4567'), 'rx-tel'));
    push(fieldError('f-meds', v('rx-meds') ? '' : 'Enter the medicines you need', 'rx-meds'));
    push(fieldError('f-pharm', v('rx-pharm') ? '' : 'Enter your pharmacy’s name and town', 'rx-pharm'));
    push(fieldError('f-ok', $('#rx-ok').checked ? '' : 'Confirm these medicines are on your repeat list. For a new medicine, book an appointment.', 'rx-ok'));

    var box = $('#rx-errors');
    if (errs.length) {
      box.innerHTML = '<div class="error-summary" role="alert" tabindex="-1"><h3>There’s a problem</h3><ul>' +
        errs.map(function (x) { return '<li><a href="' + x.href + '">' + x.msg + '</a></li>'; }).join('') + '</ul></div>';
      $$('.error-summary a', box).forEach(function (a) {
        a.addEventListener('click', function (e) { e.preventDefault(); var el = $(a.getAttribute('href')); if (el) el.focus(); });
      });
      box.firstChild.focus();
      return;
    }
    $('#rx-body').innerHTML =
      '<p class="demo-flag"><svg class="i i--sm" aria-hidden="true"><use href="#i-info"/></svg><span><strong>Demo complete.</strong> Nothing was sent or saved.</span></p>' +
      '<h3 tabindex="-1" id="rx-done">Form checked</h3>' +
      '<p>On a live site, the request would go securely to the practice for Dr Mishra to review, and the patient would get a text when the prescription is with their pharmacy. To order a real prescription, phone <a href="tel:' + PRACTICE.tel + '">' + PRACTICE.phone + '</a>.</p>' +
      '<p><button class="btn btn--primary" type="button" data-close>Close</button></p>';
    $('#rx-done').focus();
  }

  /* Printing and contacts */
  $$('[data-print-card]').forEach(function (b) {
    b.addEventListener('click', function () { document.body.classList.add('print-card'); window.print(); });
  });
  var pc = $('#print-checklist');
  if (pc) pc.addEventListener('click', function () { window.print(); });
  window.addEventListener('afterprint', function () { document.body.classList.remove('print-card'); });

  var save = $('#save-contact');
  if (save) {
    save.addEventListener('click', function () {
      var esc = function (s) { return s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;'); };
      var lines = [
        'BEGIN:VCARD', 'VERSION:3.0',
        'N:;Lugh Medical Centre;;;', 'FN:Lugh Medical Centre', 'ORG:Lugh Medical Centre',
        'TITLE:' + esc('Dr Dara Mishra, GP'),
        'TEL;TYPE=WORK,VOICE:' + PRACTICE.tel,
        'ADR;TYPE=WORK:;;' + esc('Unit 3, College House, College Heights, Hoey’s Lane') + ';Dundalk;Co. Louth;A91 KD51;Ireland',
        'NOTE:' + esc('Weekday evenings: phone the practice for the doctor on call. Weekends and public holidays: ' + PRACTICE.weekendOOH.name + ' ' + PRACTICE.weekendOOH.phone + '. Emergency: 112 or 999.'),
        'END:VCARD'
      ];
      var url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/vcard' }));
      var a = document.createElement('a');
      a.href = url; a.download = 'Lugh-Medical-Centre.vcf';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    });
  }

  /* Start */
  window.addEventListener('hashchange', route);
  route();
  renderStatus();
  renderSky();
  setInterval(function () { renderStatus(); renderSky(); }, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { renderStatus(); renderSky(); } });
  if ('ResizeObserver' in window && $('#scene')) new ResizeObserver(function () { renderSky(); }).observe($('#scene'));
  if (wideMQ.addEventListener) wideMQ.addEventListener('change', renderSky);
})();
