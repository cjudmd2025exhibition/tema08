document.addEventListener("DOMContentLoaded", () => {
  // Optional: smooth scroll if Lenis/GSAP are available
  if (window.Lenis && window.gsap && window.ScrollTrigger) {
    const lenis = new Lenis();
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

    // Rolling words (only if present on page)
    const words = document.querySelector('.words');
    if (words) {
      const spans = words.querySelectorAll('span');
      const lineHeight = spans.length ? spans[0].offsetHeight : 0;
      let index = 0;
      if (spans.length && lineHeight) {
        setInterval(() => {
          spans.forEach(s => s.classList.remove('active'));
          spans[index % spans.length].classList.add('active');
          words.style.transform = `translateY(-${index * lineHeight}px)`;
          index++;
        }, 1000);
      }
    }

    // Timeline scroll activation
    const timelineItems = document.querySelectorAll('.timeline > li');
    if (timelineItems.length) {
      const setActiveByScroll = () => {
        const viewportCenter = window.innerHeight / 2;
        let closestItem = null;
        let closestDist = Infinity;

        timelineItems.forEach((item) => {
          const rect = item.getBoundingClientRect();
          const itemCenter = rect.top + rect.height / 2;
          const dist = Math.abs(itemCenter - viewportCenter);
          if (dist < closestDist) {
            closestDist = dist;
            closestItem = item;
          }
        });

        if (closestItem) {
          timelineItems.forEach((li) => li.classList.remove('active'));
          closestItem.classList.add('active');
        }
      };

      // Initial set and on scroll/resize updates
      setActiveByScroll();
      window.addEventListener('scroll', setActiveByScroll, { passive: true });
      window.addEventListener('resize', setActiveByScroll);
    }

  const arc = document.querySelector('.lightstick-arc');
  if (!arc) return;

  // 1) DOM 내 이미지를 지정한 순서로 재배치
  // 원하는 순서: [좌] shinee, riize, suju, [중앙] nct, [우] rv, gg, aespa, boa, 이후 나머지 랜덤
  (function reorderSticks(){
    const desiredOrder = [
      'lightstick_shinee',
      'lightstick_riize',
      'lightstick_suju',
      'lightstick_nct',
      'lightstick_rv',
      'lightstick_gg',
      'lightstick_aespa',
      'lightstick_boa'
    ];

    const lis = Array.from(arc.querySelectorAll('li'));
    const pickByKey = (key) => lis.find(li => {
      const img = li.querySelector('img');
      return img && (img.getAttribute('src') || '').includes(key);
    });

    const fixed = [];
    const used = new Set();
    desiredOrder.forEach(key => {
      const li = pickByKey(key);
      if (li) { fixed.push(li); used.add(li); }
    });

    const rest = lis.filter(li => !used.has(li));
    // 간단한 셔플
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }

    const newOrder = [...fixed, ...rest];
    // DOM 갱신 (기존 자식 제거 후 새 순서로 추가)
    const frag = document.createDocumentFragment();
    newOrder.forEach(li => frag.appendChild(li));
    arc.innerHTML = '';
    arc.appendChild(frag);
  })();

  // 2) 360도 무한 원형 배치: 1세트(원본) 앞뒤로 두 세트씩 복제 = 총 5세트
  let baseItems = Array.from(arc.children);
  const setSize = baseItems.length; // 7개 (한 세트)
  const cloneWithOffset = (arr, offset) => arr.map((_, i) => arr[(i + offset + arr.length) % arr.length].cloneNode(true));
  // 앞쪽에는 offset -1, -2로 두 세트, 뒤쪽에는 +1, +2로 두 세트 → 경계 같은 이미지 연속 방지
  cloneWithOffset(baseItems, -2).forEach(n => arc.insertBefore(n, arc.firstChild));
  cloneWithOffset(baseItems, -1).forEach(n => arc.insertBefore(n, arc.firstChild));
  cloneWithOffset(baseItems, +1).forEach(n => arc.appendChild(n));
  cloneWithOffset(baseItems, +2).forEach(n => arc.appendChild(n));

  let items = Array.from(arc.children);
  const itemCount = items.length;
  // 처음 활성 항목: 중앙 세트의 lightstick_nct
  const nctBaseIndex = Array.from(arc.querySelectorAll('li img'))
    .slice(setSize*2, setSize*3) // 중앙 세트 범위만 검사
    .findIndex(img => (img.getAttribute('src') || '').includes('lightstick_nct'));
  let active = nctBaseIndex >= 0 ? (setSize*2 + nctBaseIndex) : Math.floor(itemCount / 2);

  const radius = 700;                     // 요청: 반지름 700으로 확대
  // CSS 변수로 반지름 전달(오버레이 정렬용)
  arc.style.setProperty('--arc-radius', radius + 'px');
  const angleStep = 16;                   // 기울기 감소(각도 축소)

  function render(){
    items.forEach((li, i) => {
      const rel = i - active;                 // 중심으로부터 상대 위치
      const angle = rel * angleStep;          // 도 단위
      // 원형: 하단 피벗에서 회전한 뒤 반경만큼 위로 이동
      li.classList.toggle('active', i === active);
      li.classList.toggle('dimmed', i !== active);

      li.style.transform = `translate(-50%,0) rotate(${angle}deg) translateY(${-radius}px)`;
      li.style.zIndex = String(20 - Math.abs(rel));   // 네비게이션(z=1000)보다 항상 낮음
      li.style.opacity = Math.abs(rel) > 4 ? 0 : 1;   // 너무 멀면 페이드아웃
      li.style.pointerEvents = Math.abs(rel) > 4 ? 'none' : 'auto';
    });
  }

  // 초기 렌더
  render();

  // 클릭 시 해당 항목을 중앙으로
  items.forEach((li, i) => {
    li.addEventListener('click', () => {
      if (i === active) return;
      active = i;
      render();
    });
  });

  // 윈도우 리사이즈 시 모바일 레이아웃에서는 transform 제거됨(CSS), 데스크톱 복귀 시 재계산
  window.addEventListener('resize', () => {
    // 강제 재렌더(데스크톱일 때만 의미)
    if (window.innerWidth > 820) render();
  });
});