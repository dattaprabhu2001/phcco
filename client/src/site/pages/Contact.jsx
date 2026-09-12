import { useState } from 'react';
import { useFetch, useReveal, useTitle } from '../../lib/hooks.js';
import { api } from '../../lib/api.js';
import {
  PageBanner, Loading, ErrorState, SectionHead, Prose, GenericSection,
} from '../components/Bits.jsx';
import Icon from '../components/Icon.jsx';

const TOPICS = [
  'Summer internship', 'Host a WoCON', 'Research collaboration', 'Alumni profile',
  'Webinars & events', 'Media / press', 'Something else',
];

const EMPTY = { name: '', email: '', organisation: '', topic: TOPICS[0], message: '' };
const KNOWN = ['find-us'];

export default function Contact() {
  const { data, loading, error } = useFetch('/page/contact');
  const shell = useFetch('/shell');
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  useReveal([data]);
  useTitle(data?.title);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const settings = shell.data?.settings || {};
  const address = (settings.contact_address || '').split('\n').filter(Boolean);
  const sections = data.sections || [];
  const findUs = sections.find((s) => s.section_key === 'find-us');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const sending = status.state === 'sending';

  async function submit(e) {
    e.preventDefault();
    setStatus({ state: 'sending', message: '' });
    try {
      await api.post('/contact', form);
      setForm(EMPTY);
      setStatus({ state: 'sent', message: '' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  }

  return (
    <>
      <PageBanner page={data} crumb="Contact" />

      <section className="section">
        <div className="shell">
          {/* Design order: details first in the DOM, form second; `split-rev`
              is what visually swaps them on wide screens. */}
          <div className="split split-rev">
            <div>
              <SectionHead section={findUs}
                           eyebrow={findUs?.eyebrow || 'Find us'}
                           heading={findUs?.heading || 'The centre'} />

              <ul className="contact-list reveal" style={{ marginTop: '2rem' }}>
                <li>
                  <span className="ico"><Icon name="pin" /></span>
                  <div>
                    <p className="lbl">Address</p>
                    <address>{address.map((l, i) => <span key={i}>{l}</span>)}</address>
                    <a className="maps" target="_blank" rel="noopener noreferrer"
                       href="https://maps.google.com/?q=Indian+Institute+of+Science+Bengaluru">
                      Open in Maps<Icon name="external" />
                    </a>
                  </div>
                </li>

                {settings.contact_email && (
                  <li>
                    <span className="ico"><Icon name="mail" /></span>
                    <div>
                      <p className="lbl">Email</p>
                      <a className="val" href={`mailto:${settings.contact_email}`}>
                        {settings.contact_email}
                      </a>
                    </div>
                  </li>
                )}

                {settings.contact_phone && (
                  <li>
                    <span className="ico"><Icon name="phone" /></span>
                    <div>
                      <p className="lbl">Phone</p>
                      <a className="val" href={`tel:${settings.contact_phone.replace(/[^+\d]/g, '')}`}>
                        {settings.contact_phone}
                      </a>
                    </div>
                  </li>
                )}

                <li>
                  <span className="ico"><Icon name="institution" /></span>
                  <div>
                    <p className="lbl">An initiative of</p>
                    <div className="row" style={{ marginTop: '0.75rem' }}>
                      {settings.iisc_logo && (
                        <img src={settings.iisc_logo} alt="Indian Institute of Science"
                             style={{ width: '2.5rem', height: '2.5rem' }} />
                      )}
                      <span aria-hidden="true"
                            style={{ width: '1px', height: '2rem', background: 'var(--plum-200)' }} />
                      {settings.partner_logo && (
                        <a href={settings.partner_url} target="_blank" rel="noopener noreferrer">
                          <img src={settings.partner_logo} alt="Param Hansa Philanthropies"
                               style={{ height: '2.25rem', width: 'auto' }} />
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              </ul>

              {findUs && <Prose html={findUs.body_html} />}
            </div>

            <div>
              <div className="card card-pad reveal">
                <h2 className="t-h3">Send us a message</h2>
                <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--ink-500)' }}>
                  Tell us what you&rsquo;re interested in and the team will reply by email.
                </p>

                {/* `.form-ok` is hidden until it also carries `is-shown` — the
                    stylesheet's own rule, so the class has to be added, not
                    just the element rendered. */}
                <div className={`form-ok${status.state === 'sent' ? ' is-shown' : ''}`} role="status">
                  <Icon name="check" />
                  <p>
                    Thank you — your message has reached the PHCCO team. We will reply to
                    the address you gave. For anything urgent, write to us directly at{' '}
                    <a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a>.
                  </p>
                </div>

                <form style={{ marginTop: '1.5rem' }} onSubmit={submit} noValidate>
                  {/* Two-up on 640px and above; stacked below. */}
                  <div className="form-grid">
                    <label className="field">
                      <span className="lbl">Your name<span className="req">*</span></span>
                      <input className="input" type="text" autoComplete="name" required
                             value={form.name} onChange={set('name')} />
                    </label>
                    {/* The stylesheet's `.field + .field { margin-top: 1rem }`
                        also fires inside this grid, dropping the second column
                        16px below the first. The design has that misalignment
                        live; cancel it so the pair sits on one line. */}
                    <label className="field" style={{ marginTop: 0 }}>
                      <span className="lbl">Email address<span className="req">*</span></span>
                      <input className="input" type="email" autoComplete="email" required
                             value={form.email} onChange={set('email')} />
                    </label>
                  </div>

                  <label className="field">
                    <span className="lbl">Institution or organisation</span>
                    <input className="input" type="text" autoComplete="organization"
                           value={form.organisation} onChange={set('organisation')} />
                  </label>

                  <label className="field">
                    <span className="lbl">What is this about?</span>
                    <select className="input" value={form.topic} onChange={set('topic')}>
                      {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>

                  <label className="field">
                    <span className="lbl">Message<span className="req">*</span></span>
                    <textarea className="input" rows={6} required
                              placeholder="Tell us a little about what you're after…"
                              value={form.message} onChange={set('message')} />
                  </label>

                  {status.state === 'error' && (
                    <p role="alert" style={{ marginTop: '1rem', fontSize: '0.8125rem', color: 'var(--amber-700, #9a5b00)', lineHeight: 1.6 }}>{status.message}</p>
                  )}

                  <p style={{ marginTop: '1rem' }}>
                    <button className="btn btn-primary btn-block" type="submit" disabled={sending}>
                      {sending ? 'Sending…' : <>Send message<Icon name="arrowRight" /></>}
                    </button>
                  </p>

                  {/* The static site opened a mail client and stored nothing.
                      This form posts to the API and keeps the message for the
                      CMS inbox, so the note says what actually happens. */}
                  <p className="form-note">
                    Your message is sent to the PHCCO team and stored so we can reply.
                    We never share it with anyone else.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {sections.filter((x) => !KNOWN.includes(x.section_key))
        .map((s) => <GenericSection section={s} key={s.id} />)}
    </>
  );
}
