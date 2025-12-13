export default function Home() {
    return (
      <>
        {/* HERO */}
        <section className="hero">
          <div className="hero-content">
            <h1>Cienergy Pellet Trading Platform</h1>
            <p>
              Procure certified solid biofuels for industrial process heating.
              Built on traceable supply chains, predictable delivery, and
              measurable climate impact.
            </p>
  
            <div className="hero-actions">
              <a href="/create-order" className="btn">
                Create Order
              </a>
              <a href="/orders" className="btn ghost">
                Manage Orders
              </a>
            </div>
          </div>
        </section>
  
        {/* TRUST STRIP */}
        <section className="trust">
          <div>✔ Certified biofuels</div>
          <div>✔ CAPS™ traceability</div>
          <div>✔ Industrial scale supply</div>
          <div>✔ Verified climate impact</div>
        </section>
  
        {/* CAPS */}
        <section className="card">
          <h2>CAPS™ Framework</h2>
          <p className="muted">
            Our Cultivate–Aggregate–Process–Serve model ensures full control,
            transparency, and scalability across the biofuel value chain.
          </p>
  
          <div className="caps-grid">
            <div>
              <h3>Cultivate</h3>
              <p>Energy crops on degraded & underutilised land.</p>
            </div>
            <div>
              <h3>Aggregate</h3>
              <p>Biomass sourcing from farmers & SMEs.</p>
            </div>
            <div>
              <h3>Process</h3>
              <p>Pellets & briquettes with lab-verified specs.</p>
            </div>
            <div>
              <h3>Serve</h3>
              <p>Reliable bulk supply for industrial heat demand.</p>
            </div>
          </div>
        </section>
  
        {/* PRODUCTS */}
        <section className="card">
          <h2>Solid Biofuel Products</h2>
  
          <div className="product-grid">
            <div className="product-card">
              <h3>Bio-Pellets</h3>
              <ul>
                <li>6–12 mm diameter</li>
                <li>GCV: 3200–4200 kcal/kg</li>
                <li>Low ash & moisture</li>
                <li>Boiler & co-firing ready</li>
              </ul>
            </div>
  
            <div className="product-card">
              <h3>Bio-Briquettes</h3>
              <ul>
                <li>60–100 mm</li>
                <li>Direct coal replacement</li>
                <li>Longer burn cycle</li>
                <li>Batch-wise QC reports</li>
              </ul>
            </div>
          </div>
        </section>
  
        {/* IMPACT */}
        <section className="impact">
          <h2>Measured Climate & Social Impact</h2>
  
          <div className="impact-grid">
            <div>
              <strong>&gt; 1.5 million</strong>
              <span>tCO₂e emissions reduced</span>
            </div>
            <div>
              <strong>&gt; 0.7 million</strong>
              <span>person-days of employment</span>
            </div>
            <div>
              <strong>&gt; 30,000 tons</strong>
              <span>topsoil preserved</span>
            </div>
          </div>
        </section>
  
        {/* CTA */}
        <section className="cta">
          <h2>Start Procuring Biofuels</h2>
          <p>
            Place orders, manage payments, and download invoices & receipts —
            all from one platform.
          </p>
          <a href="/create-order" className="btn">
            Create Order
          </a>
        </section>
      </>
    );
  }
  