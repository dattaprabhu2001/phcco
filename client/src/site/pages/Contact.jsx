import { useState } from 'react';
import { useFetch, useReveal, useTitle } from '../../lib/hooks.js';
import { api } from '../../lib/api.js';
import {
  PageBanner, Loading, ErrorState, SectionHead, Section, Prose, GenericSection,
} from '../components/Bits.jsx';
import Icon from '../components/Icon.jsx';

const EMPTY = { name: '', email: '', topic: '', message: '' };
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

  async function submit(e) {
    e.preventDefault();
    setStatus({ state: 'sending', message: '' });
    try {
      await api.post('/contact', form);
      setForm(EMPTY);
      setStatus({
        state: 'sent',
        message: 'Thank you — your message has reached us. We will reply by email.',
      });
    } catch (err) {
      setStatus({ state: 'error', message: err.message });
    }
  }

  return (
    <>
      <PageBanner page={data} crumb="Contact" />

      <section className="section">
        <div className="shell">
          <div className="split split-rev">
            <div>
              <SectionHead eyebrow="Get in touch" heading="Send us a message"
                           lead="Tell us what you're interested in and we'll get back to you." />

              <form className="card card-pad contact-form reveal" onSubmit={submit} noValidate>
                <label htmlFor="cf-name">Your name</label>
                <input className="input" id="cf-name" required value={form.name} onChange={set('name')} />

                <label htmlFor="cf-email">Email address</label>
                <input className="input" id="cf-email" type="email" required
                       value={form.email} onChange={set('email')} />

                <label htmlFor="cf-topic">Topic</label>
                <select className="input" id="cf-topic" value={form.topic} onChange={set('topic')}>
                  <option value="">Select a topic…</option>
                  <option>Research collaboration</option>
                  <option>Summer internship</option>
                  <option>WoCON / workshops</option>
                  <option>Media enquiry</option>
                  <option>Something else</option>
                </select>

                <label htmlFor="cf-message">Message</label>
                <textarea className="input" id="cf-message" rows={6} required
                          value={form.message} onChange={set('message')} />

                <button className="btn btn-accent" type="submit" disabled={status.state === 'sending'}>
                  {status.state === 'sending' ? 'Sending…' : 'Send message'}
                  <Icon name="arrowRight" />
                </button>

                {status.message && (
                  <p role="status" className={status.state === 'error' ? 'form-error' : 'form-ok'}>
                    {status.message}
                  </p>
                )}
              </form>
            </div>

            <div>
              <SectionHead eyebrow="Find us" heading="The centre" />
              <ul className="contact-list reveal" style={{ marginTop: '2rem' }}>
                <li>
                  <span className="ico"><Icon name="pin" /></span>
                  <div>
                    <p className="lbl">Address</p>
                    <address>{address.map((l, i) => <span key={i}>{l}</span>)}</address>
                    <a className="maps" href="https://maps.google.com/?q=Indian+Institute+of+Science+Bengaluru"
                       target="_blank" rel="noopener noreferrer">
                      Open in Maps<Icon name="external" />
                    </a>
                  </div>
                </li>
                {settings.contact_email && (
                  <li>
                    <span className="ico"><Icon name="mail" /></span>
                    <div>
                      <p className="lbl">Email</p>
                      <a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a>
                    </div>
                  </li>
                )}
                {settings.contact_phone && (
                  <li>
                    <span className="ico"><Icon name="phone" /></span>
                    <div>
                      <p className="lbl">Phone</p>
                      <a href={`tel:${settings.contact_phone.replace(/[^+\d]/g, '')}`}>
                        {settings.contact_phone}
                      </a>
                    </div>
                  </li>
                )}
              </ul>
              {findUs && <Prose html={findUs.body_html} />}
            </div>
          </div>
        </div>
      </section>

      {sections.filter((x) => !KNOWN.includes(x.section_key))
        .map((s) => <GenericSection section={s} key={s.id} />)}
    </>
  );
}
