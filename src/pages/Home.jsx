import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { animate, stagger } from 'animejs';
import { products, editions } from '../products';
import { Link } from '../router';
import { Icon, ProductGrid } from '../components/ui';
gsap.registerPlugin(ScrollTrigger);
export default function Home() {
  const root = useRef();
  const reduced = useReducedMotion();
  const [edition, setEdition] = useState(editions[0]), [chapter, setChapter] = useState(0);
  const chapterNames = ['The silhouette', 'The construction', 'The perspective', 'The statement'];
  useEffect(() => {
    if (!window.location.hash) return;
    const frame = requestAnimationFrame(() => { ScrollTrigger.refresh(); document.getElementById(window.location.hash.slice(1))?.scrollIntoView(); });
    return () => cancelAnimationFrame(frame);
  }, []);
  useLayoutEffect(() => {
    if (reduced) return;
    const ctx = gsap.context(() => {
      // One art-directed garment presentation on every device. WebGL capability
      // must not swap this artwork for the unfinished procedural prototype.
      gsap.set('.poster-motion', { transformPerspective: 1200 });
      gsap.from('.hero-title span', { yPercent: 110, stagger: .12, duration: 1.2, ease: 'power4.out', delay: .2 });
      gsap.from('.hero-intro,.edition-selector,.hero-bottom', { opacity: 0, y: 15, duration: 1, delay: .65 });
      const tl = gsap.timeline({ scrollTrigger: { trigger: '.experience', start: 'top top', end: 'bottom bottom', scrub: 1.2, onUpdate: self => setChapter(Math.min(3, Math.floor(self.progress * 4))) } });
      tl.to('.opening-copy,.edition-selector', { autoAlpha: 0, y: -50, duration: .15 }, 0)
        .to('.hero-title', { opacity: .12, scale: 1.2, duration: .2 }, 0)
        .fromTo('.story-a', { autoAlpha: 0, y: 35 }, { autoAlpha: 1, y: 0, duration: .07 }, .15)
        .to('.story-a', { autoAlpha: 0, y: -35, duration: .06 }, .36)
        .to('.light-world', { opacity: 1, duration: .14 }, .35)
        .to('.stage', { color: '#181818', duration: .14 }, .35)
        .fromTo('.story-b', { autoAlpha: 0, y: 35 }, { autoAlpha: 1, y: 0, duration: .07 }, .43)
        .to('.story-b', { autoAlpha: 0, y: -35, duration: .06 }, .65)
        .to('.crimson-world', { opacity: 1, duration: .15 }, .65)
        .to('.stage', { color: '#f1f0e9', duration: .15 }, .65)
        .fromTo('.finale-title', { opacity: 0, scale: 1.25 }, { opacity: .7, scale: 1, duration: .15 }, .73)
        .fromTo('.story-c', { autoAlpha: 0, y: 25 }, { autoAlpha: 1, y: 0, duration: .09 }, .83)
        .to('.poster-motion', { xPercent: 15, scale: 1.8, rotate: 7, rotationY: -9, rotationX: 2, duration: .26 }, 0)
        .to('.poster-motion', { xPercent: -15, scale: 1.65, rotate: -5, rotationY: 9, rotationX: -2, duration: .3 }, .29)
        .to('.poster-motion', { xPercent: 0, scale: 1, rotate: 0, rotationY: 0, rotationX: 0, duration: .3 }, .62)
        .to('.chapter-line', { scaleY: 1, duration: 1, ease: 'none' }, 0);
      gsap.utils.toArray('.reveal').forEach(el => gsap.from(el, { opacity: 0, y: 40, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));
      gsap.to('.campaign-photo img', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.campaign', start: 'top bottom', end: 'bottom top', scrub: 1 } });
    }, root);
    return () => ctx.revert();
  }, [reduced]);
  useEffect(() => { if (reduced) return; const animation = animate('.brand-line', { strokeDashoffset: [80, 0], duration: 1500, delay: stagger(180), ease: 'outExpo' }); return () => animation.revert(); }, [reduced]);


  return <div ref={root} className={'home-page theme-' + edition.id}>
      <section id="home" className="experience"><div className="stage">
        <div className="dark-world"><div className="light-column"/><div className="world-grid"/><div className="studio-ring"/></div><div className="light-world"/><div className="crimson-world"><div/><div/><div/></div>
        <div className="hero-intro opening-copy"><p className="eyebrow"><span className="red-dot"/> Edition N° 07 / Objects in motion</p><p className="tiny">PARIS — KYOTO<br/>A STUDY IN CONTRAST</p></div>
        <div className="hero-title" aria-hidden="true"><div><span>FORM</span></div><div><span>IN MOTION</span></div></div><div className="finale-title" aria-hidden="true">NOIR<br/>NOIR<br/>NOIR</div>
        <div className="garment-stage"><div className="poster-motion"><img src="/images/jacket.webp" alt={'Floating ' + edition.name.toLowerCase() + ' technical jacket with crimson piping'} fetchPriority="high" draggable={false} className={'garment-poster ' + edition.id}/></div><div className="garment-shadow"/></div>
        <div className="opening-copy hero-side"><span className="eyebrow">Form follows feeling.</span><h1>Engineered<br/>to stand <i>apart.</i></h1><p>Architectural lines.<br/>Uncompromising movement.</p><Link to="/catalog" className="inline-link">Explore the collection <Icon name="arrow"/></Link></div>
        <div className="edition-selector"><span className="tiny">SELECT AN EXPRESSION</span><div>{editions.map(e => <button key={e.id} aria-label={'Select ' + e.name + ' edition'} aria-pressed={edition.id === e.id} className={edition.id === e.id ? 'active' : ''} onClick={() => setEdition(e)}><span style={{ background: e.color }}/><small>{e.name}</small></button>)}</div></div>
        <div className="story story-a"><span className="eyebrow">01 / The construction</span><h2>Nothing<br/>left to<br/><i>chance.</i></h2><p>Articulated seams.<br/>A precise silhouette.<br/>Every detail with purpose.</p></div>
        <div className="story story-b"><span className="eyebrow">02 / A new perspective</span><h2>Designed<br/>from every<br/><i>angle.</i></h2><p>A quiet confidence.<br/>An unmistakable form.</p></div>
        <div className="story story-c"><p className="eyebrow">Edition 07 / {edition.name}</p><h2>Make your <i>statement.</i></h2><Link className="button white" to="/products/shell">Discover the technical shell <Icon name="arrow"/></Link></div>
        <div className="chapter-indicator"><span>0{chapter + 1}</span><div><i className="chapter-line"/></div><span>04</span></div><div className="hero-bottom"><span className="tiny">{chapterNames[chapter]}</span><Link to="/catalog" className="scroll-prompt"><span>Scroll to explore</span><span>↓</span></Link><span className="tiny hero-coordinate">35.6762° N / 139.6503° E</span></div>
      </div></section>
      <section className="intro-section section"><div className="intro-top reveal"><p className="eyebrow"><span className="red-dot"/> A new uniform</p><span className="tiny">AUTUMN / WINTER — EDITION 07</span></div><h2 className="reveal">Beyond the expected.<br/><i>Built around you.</i></h2><div className="intro-bottom reveal"><span className="intro-symbol">AN/07</span><p>A dialogue between precise tailoring and everyday movement. Sculptural silhouettes, considered materials, and nothing that doesn't belong.</p><Link to="/catalog" className="inline-link">Discover Edition 07 <Icon name="arrow"/></Link></div></section>
      <section id="collection" className="collection section"><div className="section-heading reveal"><div><span className="eyebrow">The collection / Selected pieces</span><h2>The considered <i>edit.</i></h2></div><span className="tiny">DESIGNED TO ENDURE.</span></div>
        <ProductGrid items={products.slice(0, 3)}/>
        <div className="collection-footer"><span>06 / CONSIDERED OBJECTS</span><Link className="inline-link" to="/catalog">Shop the full collection <Icon name="arrow"/></Link></div>
      </section>
      <section id="campaign" className="campaign"><div className="campaign-photo"><img src="/images/editorial-2.webp" alt="Atelier Noir tailoring against brutalist concrete architecture" loading="lazy"/></div><div className="campaign-shade"/><div className="campaign-top"><span className="eyebrow">THE CAMPAIGN / STUDY 07</span><span className="tiny">FORM. FUNCTION. FEELING.</span></div><div className="campaign-copy reveal"><h2>The architecture<br/>of <i>presence.</i></h2><p>Less noise. More intention.</p><Link to="/#atelier" className="button outline">Inside the atelier <Icon name="arrow"/></Link></div><span className="campaign-number">07</span></section>
      <section id="atelier" className="atelier section"><div className="atelier-heading reveal"><p className="eyebrow"><span className="red-dot"/> The atelier</p><h2>Considered.<br/>Constructed.<br/><i>Uncompromised.</i></h2><p>We see clothing as architecture for the everyday. Each proportion has a purpose. Each material brings a feeling. Each piece leaves room for you.</p></div><div className="atelier-details">{[['01', 'The material', 'A tactile vocabulary. From dense wool mélange to fluid technical nylon, texture defines the collection.'], ['02', 'The proportion', 'A deliberate balance of structure and ease. Silhouettes that hold their shape and move with you.'], ['03', 'The perspective', 'A meeting of Parisian tailoring and Japanese restraint. Designed around a quieter kind of confidence.']].map(([n, title, description]) => <div className="reveal" key={n}><span>{n}</span><div><h3>{title}</h3><p>{description}</p></div><Icon name="plus"/></div>)}</div></section>
      <section className="statement"><div className="statement-track" aria-hidden="true">FORM FOLLOWS FEELING <span>✳</span> FORM FOLLOWS FEELING <span>✳</span></div></section>
      <section className="closing section"><span className="eyebrow reveal">Your next chapter</span><h2 className="reveal">Make less.<br/><i>Mean more.</i></h2><Link to="/catalog" className="button red reveal">Explore the collection <Icon name="arrow"/></Link></section>
  </div>;
}
