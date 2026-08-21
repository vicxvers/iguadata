function HomeChrome({ interactive = true, goToHome }) {
    return (
        <div className="home-chrome">
            <div className="home-chrome-gradient is-visible" aria-hidden="true"></div>
            <div
                className="home-brand home-chrome-brand"
                onClick={interactive ? goToHome : undefined}
                onKeyDown={interactive ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        goToHome();
                    }
                } : undefined}
                role={interactive ? 'link' : undefined}
                tabIndex={interactive ? 0 : undefined}
            >
                <div className="home-logo" role="img" aria-label="Iguadata"></div>
            </div>
        </div>
    );
}

function HomeSection({ extraClassName = '', interactive = true, homeCanvasRef, handleHomeMetricLinkClick, handleNavigation, setIsMobileMenuOpen, handleAnalisiNavClick, contractCount, subvencionsCount, empresasCount, personesCount, alertesCount, homeTopSectors, homeTopCategories, homeRiskCounts }) {
    return (
        <section className={`home${extraClassName ? ` ${extraClassName}` : ''}`} aria-label="Portada editorial Iguadata" aria-hidden={!interactive}>
            <div className="home-scroll-story">
                <div className="home-hero">
                    <canvas ref={homeCanvasRef} className="home-particles" aria-hidden="true"></canvas>
                    <div className="home-hero-bottom-gradient" aria-hidden="true"></div>

                    <div className="home-intro-scene">
                        <div className="home-copy">
                            <h1 className="home-title">Tot és <em>públic</em></h1>
                            <p className="home-deck">
                                Contractes, empreses, persones, subvencions i anàlisi en una cartografia oberta de la contractació pública de {AUTHORITY_NAME}
                            </p>
                        </div>

                        <div className="home-metrics" aria-label="Indicadors principals">
                            <a href={buildRouteUrl('/contractes')} className="home-metric metric-contractes" onClick={interactive ? ((event) => handleHomeMetricLinkClick(event, () => { handleNavigation('buscador'); setIsMobileMenuOpen(false); })) : ((event) => event.preventDefault())} tabIndex={interactive ? 0 : -1}>
                                <span className="home-metric-value">{contractCount.toLocaleString('ca-ES')}</span>
                                <span className="home-metric-label">Contractes</span>
                            </a>
                            <a href={buildRouteUrl('/subvencions')} className="home-metric metric-import" onClick={interactive ? ((event) => handleHomeMetricLinkClick(event, () => { handleNavigation('subvencions'); setIsMobileMenuOpen(false); })) : ((event) => event.preventDefault())} tabIndex={interactive ? 0 : -1}>
                                <span className="home-metric-value">{subvencionsCount.toLocaleString('ca-ES')}</span>
                                <span className="home-metric-label">Subvencions</span>
                            </a>
                            <a href={buildRouteUrl('/empreses')} className="home-metric metric-empreses" onClick={interactive ? ((event) => handleHomeMetricLinkClick(event, () => { handleNavigation('empreses'); setIsMobileMenuOpen(false); })) : ((event) => event.preventDefault())} tabIndex={interactive ? 0 : -1}>
                                <span className="home-metric-value">{empresasCount.toLocaleString('ca-ES')}</span>
                                <span className="home-metric-label">Empreses</span>
                            </a>
                            <a href={buildRouteUrl('/persones')} className="home-metric metric-persones" onClick={interactive ? ((event) => handleHomeMetricLinkClick(event, () => { handleNavigation('persones'); setIsMobileMenuOpen(false); })) : ((event) => event.preventDefault())} tabIndex={interactive ? 0 : -1}>
                                <span className="home-metric-value">{personesCount.toLocaleString('ca-ES')}</span>
                                <span className="home-metric-label">Persones</span>
                            </a>
                            <a href={buildRouteUrl('/analisi')} className="home-metric metric-alertes" onClick={interactive ? ((event) => handleHomeMetricLinkClick(event, handleAnalisiNavClick)) : ((event) => event.preventDefault())} tabIndex={interactive ? 0 : -1}>
                                <span className="home-metric-value">{alertesCount.toLocaleString('ca-ES')}</span>
                                <span className="home-metric-label">Alertes</span>
                            </a>
                        </div>

                        <div className="home-scroll-invitation" aria-hidden="true">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </div>
                    </div>

                    <section className="home-chapter home-economic-scene" aria-labelledby="home-economic-title">
                        <div className="home-economic-heading">
                            <h2 id="home-economic-title">On van els <em>diners?</em></h2>
                            <p>Els sectors amb més despesa de {AUTHORITY_NAME}.</p>
                        </div>
                        <div className="home-economic-bars" aria-label="Sectors amb més import adjudicat">
                            {homeTopSectors.map(item => (
                                <div
                                    key={item.label}
                                    className="home-economic-row"
                                    style={{ '--economic-scale': item.share }}
                                >
                                    <span>{item.label}</span>
                                    <strong>{formatCompactCurrency(item.amount)}</strong>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="home-chapter home-categories-scene" aria-labelledby="home-categories-title">
                        <div className="home-categories-cloud" aria-label="Categories amb més import adjudicat">
                            {homeTopCategories.map(item => (
                                <div
                                    key={item.label}
                                    className={`home-category-word home-category-word-${Math.min(item.rank, 6)}`}
                                    style={{ '--category-scale': 0.82 + item.share * 2.4 }}
                                >
                                    <span>{item.label}</span>
                                    <strong>{formatCompactCurrency(item.amount)}</strong>
                                </div>
                            ))}
                        </div>
                        <div className="home-categories-heading">
                            <h2 id="home-categories-title">Què es <em>compra</em>?</h2>
                            <p>Els serveis més contractats de {AUTHORITY_NAME}.</p>
                        </div>
                    </section>

                    <section className="home-chapter home-patterns-scene" aria-labelledby="home-patterns-title">
                        <div className="home-patterns-heading">
                            <h2 id="home-patterns-title">I quan les dades es connecten, apareixen <em>patrons.</em></h2>
                        </div>
                        <div className="home-risk-metrics" aria-label="Alertes per nivell de risc">
                            <div className="home-risk-metric">
                                <strong>{homeRiskCounts.alt.toLocaleString('ca-ES')}</strong>
                                <span>Risc alt</span>
                            </div>
                            <div className="home-risk-metric">
                                <strong>{homeRiskCounts.mitja.toLocaleString('ca-ES')}</strong>
                                <span>Risc mitjà</span>
                            </div>
                            <div className="home-risk-metric">
                                <strong>{homeRiskCounts.baix.toLocaleString('ca-ES')}</strong>
                                <span>Risc baix</span>
                            </div>
                        </div>
                    </section>

                    <section className="home-chapter home-loop-scene" aria-labelledby="home-loop-title">
                        <div className="home-loop-copy">
                            <h2 id="home-loop-title" className="home-loop-title">El projecte de transparència <em>d'Igualada</em></h2>
                        </div>
                    </section>
                </div>
            </div>
        </section>
    );
}

function HomeLoading({ isDissolving = false, homeCanvasRef, loadingProgress }) {
    return (
        <div className={`home home-loading-screen${isDissolving ? ' is-dissolving' : ''}`}>
            <div className="home-brand">
                <div className="home-logo" role="img" aria-label="Iguadata"></div>
            </div>
            {!isDissolving && <canvas ref={homeCanvasRef} className="home-particles" aria-hidden="true"></canvas>}
            <div className="home-copy home-loading-copy">
                <h1 className="home-title">Tot és <em>públic</em></h1>
                <div className="home-loading-progress">
                    {loadingProgress.toLocaleString('ca-ES')}%
                </div>
            </div>
        </div>
    );
}
