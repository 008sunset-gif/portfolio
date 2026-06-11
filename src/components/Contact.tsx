export default function Contact() {
  return (
    <section className="section contact" id="contact">
      <span className="section__index" aria-hidden="true">
        03
      </span>
      <div className="container">
        <p className="fig" data-reveal>
          FIG.03 <span className="fig__name">/ Contact</span>
        </p>
        <dl className="contact__list" data-reveal-group>
          <div className="contact__row" data-reveal>
            <dt className="contact__key mono">Email</dt>
            <dd className="contact__val">
              <a className="contact__link mono" href="mailto:008sunset@gmail.com">
                008sunset@gmail.com
              </a>
            </dd>
          </div>
          <div className="contact__row" data-reveal>
            <dt className="contact__key mono">GitHub</dt>
            <dd className="contact__val">
              <a
                className="contact__link mono"
                href="https://github.com/008sunset-gif"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://github.com/008sunset-gif ↗
              </a>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
