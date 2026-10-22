import React, { useRef, useState } from 'react';
import { Link } from '../router';
import { useShop } from '../shop';
import { request, newId } from '../client';
import { Breadcrumb, PageHeading, Icon, Notice } from '../components/ui';
export default function Contact() {
  const { store } = useShop(); const [busy, setBusy] = useState(false), [error, setError] = useState(''), [sent, setSent] = useState('');
  const attempt = useRef(null), lock = useRef(false);
  async function submit(e) {
    e.preventDefault(); if (lock.current) return; lock.current = true; setBusy(true); setError('');
    const data = Object.fromEntries(new FormData(e.currentTarget)); data.consent = data.consent === 'on';
    const fingerprint = JSON.stringify(data);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { id: newId(), fingerprint };
    try { const result = await request('/api/contact', { data: { ...data, id: attempt.current.id } }); setSent(result.reference); }
    catch (err) { setError(err.message); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div className="commerce-page contact-page"><Breadcrumb><span>Contact</span></Breadcrumb><PageHeading eyebrow="Client services / The atelier" title="A conversation," italic="considered." text="A question about a piece, a fit, or your order. We’re here for the details."/>
    <div className="contact-layout"><aside className="contact-editorial"><div className="contact-photo"><img src="/images/editorial-2.webp" alt="Architectural study from the Atelier Noir campaign"/></div><div className="contact-caption"><span>THE ATELIER / EDITION 07</span><span>LESS NOISE. MORE INTENTION.</span></div><h2>Every detail<br/>starts with <i>you.</i></h2><p>For product guidance, order questions, or a new collaboration, leave a note for the atelier.</p>{store.identity?.email && <a className="inline-link" href={'mailto:' + store.identity.email}>{store.identity.email}<Icon name="arrow"/></a>}<div className="contact-shortcuts"><Link to="/size-guide">Find your fit <Icon name="arrow"/></Link><Link to="/delivery-returns">Delivery & returns <Icon name="arrow"/></Link></div></aside>
    <section className="contact-form-panel"><p className="eyebrow">Leave a note</p><h2>How can we <i>help?</i></h2>{sent ? <div className="contact-success" role="status"><Icon name="check"/><h3>Your note is with the atelier.</h3><p>Thank you for getting in touch. We’ll reply to the email address you provided.</p><p className="field-hint">Reference: {sent}</p><button className="button outline" onClick={() => { setSent(''); attempt.current = null; }}>Write another note</button></div> : <form onSubmit={submit} aria-label="Contact the atelier">
      {!store.loading && !store.contactReady && <Notice>The contact inbox is opening soon.{store.identity?.email && <> In the meantime, email <a href={'mailto:' + store.identity.email}>{store.identity.email}</a>.</>}</Notice>}
      {error && <Notice error>{error}</Notice>}
      <fieldset disabled={busy}><div className="form-row"><label>Your name<input name="name" autoComplete="name" required minLength={2} maxLength={100} placeholder="Full name"/></label><label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com"/></label></div><label>What’s on your mind?<select name="topic" defaultValue="Product & sizing"><option>Product & sizing</option><option>My order</option><option>Delivery & returns</option><option>Press & collaboration</option><option>Something else</option></select></label><label>Your message<textarea name="message" rows={6} required minLength={10} maxLength={4000} placeholder="Tell us a little more. For order questions, include your order reference. Please don’t include payment details."/></label><div className="honeypot" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off"/></label></div><label className="checkbox-label"><input name="consent" type="checkbox" required/><span>I have read the <Link to="/privacy" target="_blank" rel="noopener">privacy notice</Link> and agree to be contacted about my enquiry.</span></label></fieldset><button className="button red" disabled={busy || store.loading || !store.contactReady}>{busy ? 'Sending your note…' : store.loading ? 'Loading…' : !store.contactReady ? 'Inbox opening soon' : 'Send your note'}<Icon name="arrow"/></button>
    </form>}</section></div>
    <section className="contact-faq"><div><span className="eyebrow">A little clarity</span><h2>Before you <i>ask.</i></h2></div><div><details><summary>How do I choose my size?</summary><p>Each piece uses the sizing shown on its product page. Start with the <Link to="/size-guide">size guide</Link> and contact the atelier if you need more help.</p></details><details><summary>Where can I find delivery and returns details?</summary><p>Our <Link to="/delivery-returns">delivery & returns page</Link> has the current information. Available destinations and delivery charges appear before payment.</p></details><details><summary>How can I follow up on my order?</summary><p>Select “My order” in the form and include the reference from your order confirmation. Never send card numbers or other payment credentials.</p></details></div></section>
  </div>;
}
