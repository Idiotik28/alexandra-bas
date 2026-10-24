/* =========================================================
   Александра Бас — логика лендинга
   Разделы: плейсхолдеры фото, меню, календарь + слоты времени,
   карточка подтверждения, формы, GSAP-моушен.
   ========================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof gsap !== 'undefined';
  if (!hasGsap) document.documentElement.classList.add('no-gsap');

  /* сколько файлов work-N.jpg лежит в assets/img —
     добавили работу, положили файл, увеличили число */
  var WORKS_TOTAL = 9;

  /* контакты мастера — меняются в одном месте */
  var CONTACTS = {
    phone: '79775891893',          // для tel: и WhatsApp
    telegram: 'https://t.me/+79775891893'
  };

  /* ---------------------------------------------------------
     1. ПЛЕЙСХОЛДЕРЫ ФОТО
     У каждого .ph есть data-img с ожидаемым путём. Пока файла
     нет — виден пудровый градиент с подписью. Как только
     картинку положили по этому пути, она подставляется сама.
  --------------------------------------------------------- */
  function hydratePlaceholders() {
    document.querySelectorAll('.ph[data-img]').forEach(function (el) {
      var src = el.getAttribute('data-img');
      if (!src) return;
      var probe = new Image();
      probe.onload = function () {
        // ВАЖНО: абсолютный URL. Относительный путь в CSS-переменной
        // резолвится от style.css, а не от страницы, и даёт assets/css/assets/…
        el.style.setProperty('--ph-img', 'url("' + probe.src + '")');
        el.classList.add('has-img');
      };
      probe.src = src;
    });
  }

  /* ---------------------------------------------------------
     2. МЕНЮ — плавное появление и закрытие
  --------------------------------------------------------- */
  function initMenu() {
    var burger = document.getElementById('burger');
    var menu = document.getElementById('menu');
    if (!burger || !menu) return;

    var links = menu.querySelectorAll('.menu__inner a');
    var isOpen = false;

    function finishState(open) {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      document.body.style.overflow = open ? 'hidden' : '';
    }

    function setOpen(open) {
      if (open === isOpen) return;
      isOpen = open;

      // без GSAP или при reduced-motion — просто показываем/прячем
      if (!hasGsap || reduced) {
        menu.hidden = !open;
        finishState(open);
        return;
      }

      gsap.killTweensOf([menu, links]);

      if (open) {
        menu.hidden = false;
        finishState(true);
        gsap.timeline()
          .fromTo(menu, { opacity: 0 }, { opacity: 1, duration: .3, ease: 'power2.out' })
          .fromTo(links,
            { opacity: 0, y: 14 },
            { opacity: 1, y: 0, duration: .35, stagger: .05, ease: 'power2.out' },
            '-=.16');
      } else {
        finishState(false);
        gsap.to(menu, {
          opacity: 0, duration: .25, ease: 'power2.in',
          onComplete: function () {
            menu.hidden = true;
            gsap.set(links, { clearProps: 'opacity,transform' });
          }
        });
      }
    }

    burger.addEventListener('click', function () { setOpen(!isOpen); });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A' || e.target === menu) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) setOpen(false);
    });
  }

  /* ---------------------------------------------------------
     ГАЛЕРЕЯ ВСЕХ РАБОТ
     Открывается кнопкой «Смотреть все», закрывается крестиком,
     Escape или кликом по фону.
  --------------------------------------------------------- */
  function initGallery() {
    var gal = document.getElementById('gal');
    var grid = document.getElementById('galGrid');
    var openBtn = document.getElementById('worksAll');
    var closeBtn = document.getElementById('galClose');
    if (!gal || !grid || !openBtn) return;

    var built = false;
    var lastFocus = null;

    function build() {
      if (built) return;
      for (var i = 1; i <= WORKS_TOTAL; i++) {
        var cell = document.createElement('div');
        cell.className = 'gal__item';
        cell.style.backgroundImage = 'url("assets/img/work-' + i + '.jpg")';
        cell.setAttribute('role', 'img');
        cell.setAttribute('aria-label', 'Работа ' + i + ': до и после');
        grid.appendChild(cell);
      }
      var title = document.getElementById('galTitle');
      if (title) title.textContent = 'Все работы — ' + WORKS_TOTAL;
      built = true;
    }

    function open() {
      build();
      lastFocus = document.activeElement;
      gal.hidden = false;
      document.body.style.overflow = 'hidden';
      if (closeBtn) closeBtn.focus();
      if (reduced || !hasGsap) { gal.style.opacity = 1; return; }
      gsap.fromTo(gal, { opacity: 0 }, { opacity: 1, duration: .3, ease: 'power2.out' });
      gsap.fromTo(grid.children,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: .4, stagger: .04, ease: 'power2.out', delay: .1 });
    }

    function close() {
      function done() {
        gal.hidden = true;
        document.body.style.overflow = '';
        if (lastFocus) lastFocus.focus();
      }
      if (reduced || !hasGsap) { done(); return; }
      gsap.to(gal, { opacity: 0, duration: .25, ease: 'power2.in', onComplete: done });
    }

    openBtn.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    gal.addEventListener('click', function (e) {
      // клик мимо сетки закрывает
      if (e.target === gal || e.target.classList.contains('gal__scroll')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !gal.hidden) close();
    });
  }

  /* ---------------------------------------------------------
     3. КАЛЕНДАРЬ + СЛОТЫ ВРЕМЕНИ
     Клиент выбирает день и время, дальше — связь с мастером.
  --------------------------------------------------------- */
  var MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  var MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var DAYS = ['воскресенье', 'понедельник', 'вторник', 'среда',
    'четверг', 'пятница', 'суббота'];

  /* процедура длинная, поэтому слотов немного */
  var SLOTS_WEEKDAY = ['10:00', '12:30', '15:00', '17:30'];
  var SLOTS_SATURDAY = ['11:00', '13:30', '16:00'];

  var selectedDate = null;
  var selectedTime = null;

  function slotsFor(date) {
    var d = date.getDay();
    if (d === 0) return [];
    return d === 6 ? SLOTS_SATURDAY : SLOTS_WEEKDAY;
  }

  function formatDate(date) {
    return date.getDate() + ' ' + MONTHS_GEN[date.getMonth()] +
      ', ' + DAYS[date.getDay()];
  }

  /* true — человек пришёл за консультацией, без конкретного слота */
  var consultOnly = false;

  function bookingMessage() {
    if (consultOnly || !selectedDate) {
      return 'Здравствуйте! Пока не определилась с датой — хочу сначала ' +
        'консультацию по наращиванию. Когда вам удобно?';
    }
    var txt = 'Здравствуйте! Хочу записаться на ' + selectedDate.getDate() + ' ' +
      MONTHS_GEN[selectedDate.getMonth()];
    if (selectedTime) txt += ', ' + selectedTime;
    return txt + '. Подскажите, свободно ли это время?';
  }

  /* --- шаги мастера: 1 дата → 2 время → 3 связь --- */
  var step = 1;

  function paneEls() {
    return Array.prototype.slice.call(document.querySelectorAll('.wiz__pane'));
  }

  function goToStep(n) {
    var panes = paneEls();
    if (!panes.length || n === step || n < 1 || n > panes.length) return;

    var viewport = document.getElementById('wizViewport');
    var cur = panes[step - 1];
    var next = panes[n - 1];
    var forward = n > step;
    step = n;

    function swap() {
      cur.hidden = true;
      next.hidden = false;
      next.classList.add('is-current');
      cur.classList.remove('is-current');
    }

    if (reduced || !hasGsap) {
      swap();
      updateWizChrome();
      return;
    }

    var from = viewport.offsetHeight;
    swap();
    var to = viewport.offsetHeight;

    gsap.fromTo(viewport, { height: from }, {
      height: to, duration: .4, ease: 'power2.out',
      onComplete: function () { viewport.style.height = 'auto'; }
    });
    gsap.fromTo(next,
      { opacity: 0, x: forward ? 28 : -28 },
      { opacity: 1, x: 0, duration: .4, ease: 'power2.out' });

    updateWizChrome();
  }

  /* индикатор шагов, предпросмотр сообщения и ссылки связи */
  function updateWizChrome() {
    document.querySelectorAll('.wiz__step').forEach(function (el) {
      var n = Number(el.dataset.step);
      // при онлайн-консультации дата и время не нужны — помечаем пропущенными
      var skipped = consultOnly && (n === 2 || n === 3);
      el.classList.toggle('is-current', n === step);
      el.classList.toggle('is-done', n < step && !skipped);
      el.classList.toggle('is-skipped', skipped);
    });

    var back = document.getElementById('wizBack');
    if (back) back.hidden = step === 1;

    var text = bookingMessage();

    var msg = document.getElementById('msgText');
    if (msg) msg.textContent = text;

    // WhatsApp умеет принимать готовый текст прямо в ссылке
    var wa = document.getElementById('ctaWa');
    if (wa) {
      wa.href = 'https://wa.me/' + CONTACTS.phone +
        '?text=' + encodeURIComponent(text);
    }

    // у Telegram такого параметра нет — текст кладём в буфер по клику
    var tg = document.getElementById('ctaTg');
    if (tg) tg.href = CONTACTS.telegram;
  }

  function renderSlots() {
    var grid = document.getElementById('slotsGrid');
    var hint = document.getElementById('slotsHint');
    if (!grid) return;

    grid.textContent = '';
    if (!selectedDate) return;

    var list = slotsFor(selectedDate);
    if (!list.length) {
      if (hint) hint.textContent = 'В этот день не принимаю — выберите другой.';
      return;
    }

    if (hint) hint.textContent = formatDate(selectedDate) + ' — свободное время:';

    list.forEach(function (time) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot';
      btn.textContent = time;
      if (time === selectedTime) btn.classList.add('is-selected');
      btn.setAttribute('aria-pressed', String(time === selectedTime));
      btn.addEventListener('click', function () {
        selectedTime = time;
        renderSlots();
        updateWizChrome();
        goToStep(4);          // дальше сам, без кнопки «Далее»
      });
      grid.appendChild(btn);
    });
  }

  function initWizard() {
    var wiz = document.getElementById('wiz');
    if (!wiz) return;

    // «Назад»: при консультации шаги с датой и временем пропущены,
    // поэтому возвращаемся сразу к выбору формата
    var back = document.getElementById('wizBack');
    if (back) back.addEventListener('click', function () {
      if (consultOnly) {
        consultOnly = false;
        goToStep(1);
      } else {
        goToStep(step - 1);
      }
      updateWizChrome();
    });

    // пройденные шаги в индикаторе кликабельны, пропущенные — нет
    wiz.querySelectorAll('.wiz__step').forEach(function (el) {
      el.addEventListener('click', function () {
        var n = Number(el.dataset.step);
        if (n >= step || el.classList.contains('is-skipped')) return;
        if (n === 1) consultOnly = false;
        goToStep(n);
        updateWizChrome();
      });
    });

    // шаг 1 — выбор формата
    var book = document.getElementById('choiceBook');
    if (book) book.addEventListener('click', function () {
      consultOnly = false;
      updateWizChrome();
      goToStep(2);
    });

    var consult = document.getElementById('choiceConsult');
    if (consult) consult.addEventListener('click', function () {
      consultOnly = true;
      selectedDate = null;      // дата и время для консультации не нужны
      selectedTime = null;
      updateWizChrome();
      goToStep(4);              // шаги с датой и временем пропускаем
    });

    updateWizChrome();
  }

  function initCalendar() {
    var grid = document.getElementById('calGrid');
    var label = document.getElementById('calMonth');
    var prev = document.getElementById('calPrev');
    var next = document.getElementById('calNext');
    if (!grid || !label) return;

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var view = new Date(today.getFullYear(), today.getMonth(), 1);

    function render() {
      var year = view.getFullYear();
      var month = view.getMonth();
      label.textContent = MONTHS[month] + ' ' + year;

      // в России неделя начинается с понедельника
      var firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
      var total = new Date(year, month + 1, 0).getDate();

      grid.textContent = '';

      for (var i = 0; i < firstDow; i++) {
        var pad = document.createElement('span');
        pad.className = 'cal__day cal__day--empty';
        grid.appendChild(pad);
      }

      for (var d = 1; d <= total; d++) {
        var date = new Date(year, month, d);
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cal__day';
        btn.textContent = String(d);
        btn.setAttribute('role', 'gridcell');

        var isSunday = date.getDay() === 0;
        var isPast = date < today;
        if (isSunday || isPast) {
          btn.disabled = true;
          btn.title = isSunday ? 'Воскресенье — выходной' : 'Дата уже прошла';
        }
        if (date.getTime() === today.getTime()) btn.classList.add('is-today');
        if (selectedDate && date.getTime() === selectedDate.getTime()) {
          btn.classList.add('is-selected');
        }

        btn.addEventListener('click', (function (dt) {
          return function () {
            selectedDate = dt;
            selectedTime = null;   // день сменился — время сбрасываем
            consultOnly = false;   // выбрали дату — это уже не консультация
            render();
            renderSlots();
            updateWizChrome();
            goToStep(3);           // календарь — шаг 2, время — шаг 3
          };
        })(date));

        grid.appendChild(btn);
      }

      var atCurrentMonth = year === today.getFullYear() && month === today.getMonth();
      if (prev) prev.disabled = atCurrentMonth;
    }

    if (prev) prev.addEventListener('click', function () {
      view.setMonth(view.getMonth() - 1);
      render();
    });
    if (next) next.addEventListener('click', function () {
      view.setMonth(view.getMonth() + 1);
      render();
    });

    render();
    renderSlots();
    updateWizChrome();
  }

  /* ---------------------------------------------------------
     4. TELEGRAM
     Прямую ссылку на чат нельзя открыть с готовым текстом,
     поэтому копируем сообщение в буфер перед переходом.
  --------------------------------------------------------- */
  function initTelegram() {
    var tg = document.getElementById('ctaTg');
    var hint = document.getElementById('wizHint');
    if (!tg) return;
    tg.href = CONTACTS.telegram;

    tg.addEventListener('click', function () {
      if (!navigator.clipboard || !hint) return;
      navigator.clipboard.writeText(bookingMessage()).then(function () {
        hint.textContent = 'Текст скопирован — вставьте его в чат Telegram.';
        hint.classList.add('is-done');
        setTimeout(function () {
          hint.textContent = 'Нажмите удобный способ — текст подставится сам.';
          hint.classList.remove('is-done');
        }, 7000);
      }).catch(function () { /* буфер недоступен — не страшно */ });
    });
  }

  /* ---------------------------------------------------------
     5. ПОДПИСКА В ФУТЕРЕ
  --------------------------------------------------------- */

  function initSubForm() {
    var form = document.getElementById('subform');
    var status = document.getElementById('subStatus');
    if (!form) return;
    var input = form.querySelector('#sub-mail');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = input.value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
        if (status) status.textContent = 'Проверьте адрес почты';
        return;
      }
      if (status) status.textContent = 'Готово — письмо об уходе придёт раз в месяц.';
      form.reset();
    });
  }

  /* ---------------------------------------------------------
     6. МОУШЕН — GSAP + ScrollTrigger
     Один набор easing/длительностей на весь сайт.
  --------------------------------------------------------- */
  function initMotion() {
    if (reduced || !hasGsap) return;
    if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

    gsap.timeline({ defaults: { ease: 'power2.out', duration: .8 } })
      .from('.hero__title', { opacity: 0, y: 26 })
      .from('.hero__cta', { opacity: 0, y: 18 }, '-=.5')
      .from('.hero__text', { opacity: 0, y: 18 }, '-=.6')
      .from('.minicard', { opacity: 0, y: 22, stagger: .08 }, '-=.55')
      .from('.worksbtn', { opacity: 0, y: 18 }, '-=.6');

    if (typeof ScrollTrigger === 'undefined') return;

    gsap.to('.hero__bg', {
      yPercent: 8,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });

    gsap.utils.toArray('.reveal').forEach(function (el) {
      gsap.from(el, {
        opacity: 0, y: 24, duration: .55, ease: 'power2.out',
        // появляются один раз: при скролле вверх контент не должен исчезать
        scrollTrigger: { trigger: el, start: 'top 85%', once: true }
      });
    });

    [['.svc__card', '.svc'], ['.work', '.works__grid'], ['.price__row', '.price__list'],
     ['.prod', '.cards'], ['.why__card', '.why__cards']]
      .forEach(function (pair) {
        var items = gsap.utils.toArray(pair[0]);
        if (!items.length) return;
        gsap.from(items, {
          opacity: 0, y: 20, duration: .5, ease: 'power2.out',
          stagger: { each: .07, from: 'start' },
          scrollTrigger: { trigger: pair[1], start: 'top 85%', once: true }
        });
      });

    gsap.utils.toArray('.stat__num').forEach(function (el) {
      var target = Number(el.dataset.count || 0);
      gsap.fromTo(el, { textContent: 0 }, {
        textContent: target,
        duration: 1.4, ease: 'power1.out',
        snap: { textContent: 1 },
        scrollTrigger: { trigger: el, start: 'top 90%', once: true }
      });
    });
  }

  /* ---------------------------------------------------------
     7. АКТИВНЫЙ ПУНКТ МЕНЮ
  --------------------------------------------------------- */
  function initNavHighlight() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.hdr__link'));
    var sections = links
      .map(function (a) { return document.querySelector(a.getAttribute('href')); })
      .filter(Boolean);
    if (!sections.length || !('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(function (s) { io.observe(s); });
  }

  /* --------------------------------------------------------- */
  function boot() {
    hydratePlaceholders();
    initMenu();
    initGallery();
    initCalendar();
    initWizard();
    initTelegram();
    initSubForm();
    initNavHighlight();
    initMotion();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
