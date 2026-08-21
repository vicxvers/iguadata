/* ---- CasFraccionamentView ---------------------------------------- */
function CasFraccionamentView({ caso, contracts, empreses, onBack, onContractSelect, onEmpresaClick }) {
    if (!caso) return null;
    const pct = caso.limit_legal > 0 ? (caso.import_total / caso.limit_legal) * 100 : 0;
    const overLimit = pct > 100;
    const limitShare = overLimit && caso.import_total > 0 ? (caso.limit_legal / caso.import_total) * 100 : Math.min(pct, 100);
    const overShare = overLimit ? 100 - limitShare : 0;
    const itemsPerPage = 25;
    const [currentPage, setCurrentPage] = useState(1);
    const [shareActionsOpen, setShareActionsOpen] = useState(false);
    const [shareCopyStatus, setShareCopyStatus] = useState('');
    const shareActionsRef = useRef(null);
    const shareStatusTimerRef = useRef(null);

    const casContracts = useMemo(() =>
        (caso.contractes || []).map(cc => {
            const full = findMatchingContract(contracts, cc);
            return { ...cc, slug: full ? full.slug : buildContractSlug(cc), fullObj: full || cc };
        })
        , [caso, contracts]);
    const isSingleContractAlert = casContracts.length === 1 || caso.tipus_alerta === 'contracte_proper_limit';

    const totalPages = Math.ceil(casContracts.length / itemsPerPage);
    const contractesPaginats = casContracts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => {
        if (!shareActionsOpen) return;
        const closeShareActions = (event) => {
            if (event.type === 'keydown' && event.key !== 'Escape') return;
            if (event.type === 'pointerdown' && shareActionsRef.current?.contains(event.target)) return;
            setShareActionsOpen(false);
        };
        document.addEventListener('pointerdown', closeShareActions);
        document.addEventListener('keydown', closeShareActions);
        return () => {
            document.removeEventListener('pointerdown', closeShareActions);
            document.removeEventListener('keydown', closeShareActions);
        };
    }, [shareActionsOpen]);

    useEffect(() => () => window.clearTimeout(shareStatusTimerRef.current), []);

    const copyFraccionamentLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setShareCopyStatus('Enllaç copiat');
        } catch (_) {
            setShareCopyStatus("No s'ha pogut copiar");
        }
        window.clearTimeout(shareStatusTimerRef.current);
        shareStatusTimerRef.current = window.setTimeout(() => setShareCopyStatus(''), 1800);
    };

    return (
        <div className="container analisi-detail-page">
            <h1 className="page-title">Detall de fraccionament</h1>
            <div className="analisi-detail-hero analisi-case-hero analisi-case-fraccionament">
                <div className="analisi-case-amount">{formatCurrency(caso.import_total)}</div>
                <div className="contract-header analisi-case-header analisi-fraccionament-title-row">
                    <h2 className="analisi-case-title-wrap">
                        {(caso.empreses || []).map((nom, i) => {
                            const emp = empreses.find(e => e.nom === nom);
                            const slug = emp ? emp.slug : buildEmpresaSlug(nom);
                            return (
                                <a key={i} href={buildRouteUrl(`/empreses/${slug}`)}
                                    onClick={(event) => handleInternalLinkClick(event, () => onEmpresaClick(nom))}
                                    className="analisi-case-title-link">
                                    {nom}
                                </a>
                            );
                        })}
                    </h2>
                </div>
                <div className="analisi-detail-contract-count">
                    {casContracts.length} {casContracts.length === 1 ? 'contracte' : 'contractes'}
                </div>
                <div className="contract-pills analisi-detail-hero-pills">
                    <span className={"risk-badge " + riskClass(caso.nivell)}>{riskLabel(caso.nivell)}</span>
                    <span className={"risk-badge " + riskClass(caso.nivell)} style={{ fontVariantNumeric: 'tabular-nums' }}>{Number.isInteger(caso.risc) ? caso.risc : Number(caso.risc).toFixed(1)}/100</span>
                </div>
            </div>

            <section className="analisi-detail-section-card" aria-labelledby="concentracio-company-title">
                <h2 id="concentracio-company-title" className="analisi-detail-section-title">{caso.tipus_concentracio === 'xarxa' ? 'Xarxa mercantil concentrada' : 'Empresa dominant'}</h2>
                <ul className="analisi-detail-text-list">
                    {(caso.empreses || []).map(nom => {
                        const emp = empreses.find(e => e.nom === nom);
                        const slug = emp ? emp.slug : buildEmpresaSlug(nom);
                        return <li key={nom}><a href={buildRouteUrl(`/empreses/${slug}`)} onClick={(event) => handleInternalLinkClick(event, () => onEmpresaClick(nom))} className="analisi-detail-company-link">{nom}</a></li>;
                    })}
                </ul>
            </section>

            <div className="analisi-detail-info-card">
                <div className="contract-meta analisi-detail-info-meta">
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">Període</span>
                        <span className="contract-meta-value">
                            {isSingleContractAlert ? formatDate(caso.data_inici) : `${formatDate(caso.data_inici)} – ${formatDate(caso.data_fi)}`}
                        </span>
                    </div>
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">{isSingleContractAlert ? 'Import' : 'Similitud'}</span>
                        <span className="contract-meta-value">{isSingleContractAlert ? `${Math.round(pct)}% límit` : `${Math.round((caso.similitud_objecte || 0) * 100)}%`}</span>
                    </div>
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">Durada</span>
                        <span className="contract-meta-value">{isSingleContractAlert ? 'Un dia' : `${caso.dies_entre_primer_i_ultim} dies`}</span>
                    </div>
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">Tipus</span>
                        <span className="contract-meta-value">{formatTipusLimit(caso.tipus_limit)}</span>
                    </div>
                </div>
            </div>

            <section className="analisi-detail-section-card analisi-fraccionament-limit" aria-label="Llindar del contracte menor">
                <div className="analisi-detail-section-body">
                    <div className="contract-meta-label analisi-detail-section-label">
                        {isSingleContractAlert ? 'Import del contracte' : 'Import acumulat'}
                    </div>
                    <ul className="stack-list">
                        <li className="analisi-case-row">
                            <span className="analisi-case-row-strong">{formatCurrency(caso.import_total)} / {formatCurrency(caso.limit_legal)}</span>
                            <span className={overLimit ? 'analisi-case-row-danger' : 'analisi-case-row-strong'} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                {overLimit ? `+${Math.round(pct)}% sobre el límit legal` : `${Math.round(pct)}% del límit legal`}
                            </span>
                        </li>
                    </ul>
                    <div className="analisi-case-progress" aria-hidden="true">
                        <div className="analisi-case-progress-segment analisi-case-progress-limit" style={{ width: limitShare + '%' }}></div>
                        {overLimit && <div className="analisi-case-progress-segment analisi-case-progress-over" style={{ width: overShare + '%' }}></div>}
                    </div>
                </div>
            </section>

            {(caso.administradors_comuns || []).length > 0 && (
                <section className="analisi-detail-section-card" aria-labelledby="fraccionament-relations-title">
                    <h2 id="fraccionament-relations-title" className="analisi-detail-section-title">Administradors comuns</h2>
                    <ul className="analisi-detail-text-list">
                        {caso.administradors_comuns.map(a => <li key={a}>{a}</li>)}
                    </ul>
                </section>
            )}

            {(caso.motius || []).length > 0 && (
                <section className="analisi-detail-section-card" aria-labelledby="fraccionament-indicators-title">
                    <h2 id="fraccionament-indicators-title" className="analisi-detail-section-title">Indicadors</h2>
                    <ul className="analisi-detail-text-list">
                        {caso.motius.map(m => <li key={m}>{formatMotiuFraccionament(m)}</li>)}
                    </ul>
                </section>
            )}

            {contractesPaginats.map((cc, i) => (
                cc.slug && cc.fullObj ? (
                    <a key={`${cc.codigo}-${i}`} href={buildRouteUrl(`/contractes/${cc.slug}`)} className="card-link-wrapper" onClick={(event) => handleInternalLinkClick(event, () => onContractSelect(cc.fullObj))}>
                        <div className="contract-card">
                            <div className="contract-header">
                                <div className="contract-title">{cc.descripcion}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                                    <div className="contract-amount">{formatCurrency(cc.importe)}</div>
                                </div>
                            </div>
                            <div className="contract-meta">
                                <div className="contract-meta-item"><span className="contract-meta-label">Empresa adjudicatària</span><span className="contract-meta-value">{cc.adjudicatario}</span></div>
                                <div className="contract-meta-item"><span className="contract-meta-label">Data</span><span className="contract-meta-value">{formatDate(cc.fecha)}</span></div>
                                <div className="contract-meta-item"><span className="contract-meta-label">Codi expedient</span><span className="contract-meta-value">{cc.codigo}</span></div>
                                <div className="contract-pills">
                                    <span className="contract-pill">{formatTipus(cc.tipo)}</span>
                                    <span className="contract-pill procedure">{formatProcediment(cc.procedimiento)}</span>
                                </div>
                            </div>
                        </div>
                    </a>
                ) : (
                    <div key={`${cc.codigo}-${i}`} className="contract-card">
                        <div className="contract-header">
                            <div className="contract-title">{cc.descripcion}</div>
                            <div className="contract-amount">{formatCurrency(cc.importe)}</div>
                        </div>
                        <div className="contract-meta">
                            <div className="contract-meta-item"><span className="contract-meta-label">Empresa adjudicatària</span><span className="contract-meta-value">{cc.adjudicatario}</span></div>
                            <div className="contract-meta-item"><span className="contract-meta-label">Data</span><span className="contract-meta-value">{formatDate(cc.fecha)}</span></div>
                            <div className="contract-meta-item"><span className="contract-meta-label">Codi expedient</span><span className="contract-meta-value">{cc.codigo}</span></div>
                            <div className="contract-pills">
                                <span className="contract-pill">{formatTipus(cc.tipo)}</span>
                                <span className="contract-pill procedure">{formatProcediment(cc.procedimiento)}</span>
                            </div>
                        </div>
                    </div>
                )
            ))}
            {casContracts.length > itemsPerPage && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    showTitles={false}
                />
            )}
            <div className="contracte-detail-actions-row">
                <button onClick={onBack} className="btn-share contracte-detail-back" title="Tornar" aria-label="Tornar" type="button">
                    <svg className="contracte-detail-back-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg>
                    <span>Tornar</span>
                </button>
                <div className={`contracte-detail-share contracte-detail-share-standalone${shareActionsOpen ? ' is-open' : ''}`} ref={shareActionsRef}>
                    <div id="fraccionament-share-actions" className="contracte-detail-share-actions" aria-hidden={!shareActionsOpen}>
                        <button className="btn-share contracte-detail-share-btn" onClick={copyFraccionamentLink} tabIndex={shareActionsOpen ? 0 : -1} type="button">
                            {shareCopyStatus || "Copia l'enllaç"}
                        </button>
                    </div>
                    <button className="btn-share contracte-detail-share-btn" onClick={() => setShareActionsOpen(open => !open)} aria-expanded={shareActionsOpen} aria-controls="fraccionament-share-actions" type="button">
                        <em className="share-arrow"></em> Compartir
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ---- CasConcentracioView ---------------------------------------- */
function CasConcentracioView({ caso, contracts, empreses, onBack, onContractSelect, onEmpresaClick }) {
    if (!caso) return null;
    const itemsPerPage = 25;
    const [currentPage, setCurrentPage] = useState(1);
    const [shareActionsOpen, setShareActionsOpen] = useState(false);
    const [shareCopyStatus, setShareCopyStatus] = useState('');
    const shareActionsRef = useRef(null);
    const shareStatusTimerRef = useRef(null);
    const casContracts = useMemo(() =>
        (caso.contractes || []).map(cc => {
            const full = findMatchingContract(contracts, cc);
            return { ...cc, slug: full ? full.slug : buildContractSlug(cc), fullObj: full || cc };
        })
        , [caso, contracts]);
    const totalPages = Math.ceil(casContracts.length / itemsPerPage);
    const contractesPaginats = casContracts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const isHistoricConcentracio = caso.finestra === 'historic';
    const quotaPercent = Math.max(0, Math.min(100, Math.round((Number(caso.quota_import) || 0) * 100)));
    const quotaTone = quotaClass(caso.quota_import);
    const concentrationType = isHistoricConcentracio ? 'Històrica' : 'Temporal';

    useEffect(() => {
        if (!shareActionsOpen) return;
        const closeShareActions = (event) => {
            if (event.type === 'keydown' && event.key !== 'Escape') return;
            if (event.type === 'pointerdown' && shareActionsRef.current?.contains(event.target)) return;
            setShareActionsOpen(false);
        };
        document.addEventListener('pointerdown', closeShareActions);
        document.addEventListener('keydown', closeShareActions);
        return () => {
            document.removeEventListener('pointerdown', closeShareActions);
            document.removeEventListener('keydown', closeShareActions);
        };
    }, [shareActionsOpen]);

    useEffect(() => () => window.clearTimeout(shareStatusTimerRef.current), []);

    const copyConcentracioLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setShareCopyStatus('Enllaç copiat');
        } catch (_) {
            setShareCopyStatus("No s'ha pogut copiar");
        }
        window.clearTimeout(shareStatusTimerRef.current);
        shareStatusTimerRef.current = window.setTimeout(() => setShareCopyStatus(''), 1800);
    };

    return (
        <div className="container analisi-detail-page">
            <h1 className="page-title">Detall de concentració</h1>
            <div className="analisi-detail-hero analisi-case-hero analisi-case-concentracio">
                <div className="analisi-case-amount">{formatCurrency(caso.import_concentrat)}</div>
                <div className="contract-header analisi-case-header analisi-fraccionament-title-row">
                    <h2 className="analisi-case-title-wrap"><span className="analisi-case-title">{formatSectorName(caso.sector)}</span></h2>
                </div>
                <div className="analisi-detail-contract-count">{casContracts.length} {casContracts.length === 1 ? 'contracte' : 'contractes'}</div>
                <div className="contract-pills analisi-detail-hero-pills">
                    <span className={"risk-badge " + riskClass(caso.nivell)}>{riskLabel(caso.nivell)}</span>
                    <span className={"risk-badge " + riskClass(caso.nivell)} style={{ fontVariantNumeric: 'tabular-nums' }}>{Number.isInteger(caso.risc) ? caso.risc : Number(caso.risc).toFixed(1)}/100</span>
                </div>
            </div>

            <div className="analisi-detail-info-card">
                <div className={`contract-meta analisi-detail-info-meta analisi-detail-info-meta-concentracio${isHistoricConcentracio ? ' is-historic' : ''}`}>
                    {!isHistoricConcentracio && <div className="contract-meta-item"><span className="contract-meta-label">Període</span><span className="contract-meta-value">{formatConcentracioPeriod(caso)}</span></div>}
                    <div className="contract-meta-item"><span className="contract-meta-label">Tipus</span><span className="contract-meta-value">{concentrationType}</span></div>
                    <div className="contract-meta-item"><span className="contract-meta-label">Import del sector</span><span className="contract-meta-value">{formatCurrency(caso.import_sector)}</span></div>
                    <div className="contract-meta-item"><span className="contract-meta-label">Contractes del sector</span><span className="contract-meta-value">{caso.contractes_sector}</span></div>
                    <div className="analisi-detail-info-extra">
                        <span className="contract-meta-label">Quota de mercat</span>
                        <span className={"analisi-case-quota analisi-case-quota-" + quotaTone}>{quotaPercent}%</span>
                        <span className="analisi-case-quota-bar" aria-hidden="true"><span className={"analisi-case-quota-fill analisi-case-quota-fill-" + quotaTone} style={{ width: `${quotaPercent}%` }} /></span>
                    </div>
                </div>
            </div>

            {(caso.administradors_comuns || []).length > 0 && (
                <section className="analisi-detail-section-card" aria-labelledby="concentracio-relations-title">
                    <h2 id="concentracio-relations-title" className="analisi-detail-section-title">Administradors comuns</h2>
                    <ul className="analisi-detail-text-list">{caso.administradors_comuns.map(a => <li key={a}>{a}</li>)}</ul>
                </section>
            )}

            {(caso.motius || []).length > 0 && (
                <section className="analisi-detail-section-card" aria-labelledby="concentracio-indicators-title">
                    <h2 id="concentracio-indicators-title" className="analisi-detail-section-title">Indicadors</h2>
                    <ul className="analisi-detail-text-list">{caso.motius.map(m => <li key={m}>{m}</li>)}</ul>
                </section>
            )}

            {contractesPaginats.map((cc, i) => (
                cc.slug && cc.fullObj ? (
                    <a key={`${cc.codigo}-${i}`} href={buildRouteUrl(`/contractes/${cc.slug}`)} className="card-link-wrapper" onClick={(event) => handleInternalLinkClick(event, () => onContractSelect(cc.fullObj))}>
                        <div className="contract-card">
                            <div className="contract-header"><div className="contract-title">{cc.descripcion}</div><div className="contract-amount">{formatCurrency(cc.importe)}</div></div>
                            <div className="contract-meta">
                                <div className="contract-meta-item"><span className="contract-meta-label">Empresa adjudicatària</span><span className="contract-meta-value">{cc.adjudicatario}</span></div>
                                <div className="contract-meta-item"><span className="contract-meta-label">Data</span><span className="contract-meta-value">{formatDate(cc.fecha)}</span></div>
                                <div className="contract-meta-item"><span className="contract-meta-label">Codi expedient</span><span className="contract-meta-value">{cc.codigo}</span></div>
                                <div className="contract-pills"><span className="contract-pill">{formatTipus(cc.tipo)}</span><span className="contract-pill procedure">{formatProcediment(cc.procedimiento)}</span></div>
                            </div>
                        </div>
                    </a>
                ) : (
                    <div key={`${cc.codigo}-${i}`} className="contract-card">
                        <div className="contract-header"><div className="contract-title">{cc.descripcion}</div><div className="contract-amount">{formatCurrency(cc.importe)}</div></div>
                        <div className="contract-meta">
                            <div className="contract-meta-item"><span className="contract-meta-label">Empresa adjudicatària</span><span className="contract-meta-value">{cc.adjudicatario}</span></div>
                            <div className="contract-meta-item"><span className="contract-meta-label">Data</span><span className="contract-meta-value">{formatDate(cc.fecha)}</span></div>
                            <div className="contract-meta-item"><span className="contract-meta-label">Codi expedient</span><span className="contract-meta-value">{cc.codigo}</span></div>
                            <div className="contract-pills"><span className="contract-pill">{formatTipus(cc.tipo)}</span><span className="contract-pill procedure">{formatProcediment(cc.procedimiento)}</span></div>
                        </div>
                    </div>
                )
            ))}
            {casContracts.length > itemsPerPage && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    showTitles={false}
                />
            )}
            <div className="contracte-detail-actions-row">
                <button onClick={onBack} className="btn-share contracte-detail-back" title="Tornar" aria-label="Tornar" type="button"><svg className="contracte-detail-back-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg><span>Tornar</span></button>
                <div className={`contracte-detail-share contracte-detail-share-standalone${shareActionsOpen ? ' is-open' : ''}`} ref={shareActionsRef}>
                    <div id="concentracio-share-actions" className="contracte-detail-share-actions" aria-hidden={!shareActionsOpen}><button className="btn-share contracte-detail-share-btn" onClick={copyConcentracioLink} tabIndex={shareActionsOpen ? 0 : -1} type="button">{shareCopyStatus || "Copia l'enllaç"}</button></div>
                    <button className="btn-share contracte-detail-share-btn" onClick={() => setShareActionsOpen(open => !open)} aria-expanded={shareActionsOpen} aria-controls="concentracio-share-actions" type="button"><em className="share-arrow"></em> Compartir</button>
                </div>
            </div>
        </div>
    );
}

/* ---- CasElectoralismeView --------------------------------------- */
function CasElectoralismeView({ caso, contracts, empreses, onBack, onContractSelect, onEmpresaClick }) {
    if (!caso) return null;
    const [shareActionsOpen, setShareActionsOpen] = useState(false);
    const [shareCopyStatus, setShareCopyStatus] = useState('');
    const shareActionsRef = useRef(null);
    const shareStatusTimerRef = useRef(null);
    const casContracts = useMemo(() =>
        (caso.contractes || []).map(cc => {
            const full = findMatchingContract(contracts, cc);
            return { ...cc, slug: full ? full.slug : buildContractSlug(cc), fullObj: full || cc };
        })
        , [caso, contracts]);
    const contracte = casContracts[0] || {};
    const recurrencia = caso.recurrencia || {};
    const empresaPrincipal = (caso.empreses && caso.empreses[0]) || caso.empresa || contracte.adjudicatario || '';
    const empresaPrincipalData = empreses.find(e => e.nom === empresaPrincipal);
    const empresaPrincipalSlug = empresaPrincipalData ? empresaPrincipalData.slug : buildEmpresaSlug(empresaPrincipal);
    const hasRecurrencia = (recurrencia.objecte_similar || 0) > 0;
    const termLabels = {
        campanya: 'campanya',
        comunicacio: 'comunicació',
        difusio: 'difusió',
        disseny: 'disseny',
        publicitat: 'publicitat',
        publicitaria: 'publicitària',
        video: 'vídeo',
        retolacio: 'retolació',
        impressio: 'impressió',
        promocio: 'promoció',
        inauguracio: 'inauguració',
        presentacio: 'presentació',
    };
    const conceptes = (caso.termes_detectats || []).map(t => termLabels[t] || t).join(', ');
    const conceptesText = conceptes ? conceptes.charAt(0).toUpperCase() + conceptes.slice(1) : '';
    const isPreElectoral = caso.fase_temporal === 'Finestra administrativa prèvia';
    const isPostElectoral = caso.fase_temporal === 'Finestra administrativa posterior';
    const temporalLabel = isPreElectoral ? 'Dies abans' : (isPostElectoral ? 'Dies després' : 'Votació en');
    const temporalValue = isPreElectoral ? (caso.dies_abans_convocatoria || 0) : (isPostElectoral ? (caso.dies_despres_votacio || 0) : caso.dies_fins_votacio);

    useEffect(() => {
        if (!shareActionsOpen) return;
        const closeShareActions = (event) => {
            if (event.type === 'keydown' && event.key !== 'Escape') return;
            if (event.type === 'pointerdown' && shareActionsRef.current?.contains(event.target)) return;
            setShareActionsOpen(false);
        };
        document.addEventListener('pointerdown', closeShareActions);
        document.addEventListener('keydown', closeShareActions);
        return () => {
            document.removeEventListener('pointerdown', closeShareActions);
            document.removeEventListener('keydown', closeShareActions);
        };
    }, [shareActionsOpen]);

    useEffect(() => () => window.clearTimeout(shareStatusTimerRef.current), []);

    const copyElectoralismeLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setShareCopyStatus('Enllaç copiat');
        } catch (_) {
            setShareCopyStatus("No s'ha pogut copiar");
        }
        window.clearTimeout(shareStatusTimerRef.current);
        shareStatusTimerRef.current = window.setTimeout(() => setShareCopyStatus(''), 1800);
    };

    return (
        <div className="container analisi-detail-page">
            <h1 className="page-title">Detall d'electoralisme</h1>
            <div className="analisi-detail-hero analisi-case-hero analisi-case-electoralisme">
                <div className="analisi-case-amount">{formatCurrency(caso.import_total)}</div>
                <div className="contract-header analisi-case-header analisi-fraccionament-title-row">
                    <h2 className="analisi-case-title-wrap">
                        <a href={buildRouteUrl(`/empreses/${empresaPrincipalSlug}`)} onClick={(event) => handleInternalLinkClick(event, () => onEmpresaClick(empresaPrincipal))} className="analisi-case-title-link">{empresaPrincipal}</a>
                    </h2>
                </div>
                <div className="analisi-detail-contract-count">{casContracts.length} {casContracts.length === 1 ? 'contracte' : 'contractes'}</div>
                <div className="contract-pills analisi-detail-hero-pills">
                    <span className={"risk-badge " + riskClass(caso.nivell)}>{riskLabel(caso.nivell)}</span>
                    <span className={"risk-badge " + riskClass(caso.nivell)} style={{ fontVariantNumeric: 'tabular-nums' }}>{Number.isInteger(caso.risc) ? caso.risc : Number(caso.risc).toFixed(1)}/100</span>
                </div>
            </div>

            <div className="analisi-detail-info-card">
                <div className="contract-meta analisi-detail-info-meta">
                    <div className="contract-meta-item"><span className="contract-meta-label">Període</span><span className="contract-meta-value">{caso.periode_electoral}</span></div>
                    <div className="contract-meta-item"><span className="contract-meta-label">Data</span><span className="contract-meta-value">{formatDate(caso.data_inici)}</span></div>
                    <div className="contract-meta-item"><span className="contract-meta-label">{temporalLabel}</span><span className="contract-meta-value">{temporalValue} dies</span></div>
                    <div className="contract-meta-item"><span className="contract-meta-label">Recurrència</span><span className="contract-meta-value">{hasRecurrencia ? 'Sí' : 'No'}</span></div>
                </div>
            </div>

            {(caso.termes_detectats || []).length > 0 && (
                <section className="analisi-detail-section-card" aria-labelledby="electoralisme-concepts-title">
                    <h2 id="electoralisme-concepts-title" className="analisi-detail-section-title">Conceptes</h2>
                    <div className="analisi-detail-section-value">{conceptesText}</div>
                </section>
            )}

            {(caso.motius || []).length > 0 && (
                <section className="analisi-detail-section-card" aria-labelledby="electoralisme-indicators-title">
                    <h2 id="electoralisme-indicators-title" className="analisi-detail-section-title">Indicadors</h2>
                    <ul className="analisi-detail-text-list">{caso.motius.map(m => <li key={m}>{m}</li>)}</ul>
                </section>
            )}

            {contracte.slug && contracte.fullObj ? (
                <a href={buildRouteUrl(`/contractes/${contracte.slug}`)} className="card-link-wrapper" onClick={(event) => handleInternalLinkClick(event, () => onContractSelect(contracte.fullObj))}>
                    <div className="contract-card">
                        <div className="contract-header"><div className="contract-title">{contracte.descripcion}</div><div className="contract-amount">{formatCurrency(contracte.importe)}</div></div>
                        <div className="contract-meta">
                            <div className="contract-meta-item"><span className="contract-meta-label">Empresa adjudicatària</span><span className="contract-meta-value">{contracte.adjudicatario}</span></div>
                            <div className="contract-meta-item"><span className="contract-meta-label">Data</span><span className="contract-meta-value">{formatDate(contracte.fecha)}</span></div>
                            <div className="contract-meta-item"><span className="contract-meta-label">Codi expedient</span><span className="contract-meta-value">{contracte.codigo}</span></div>
                            <div className="contract-pills"><span className="contract-pill">{formatTipus(contracte.tipo)}</span><span className="contract-pill procedure">{formatProcediment(contracte.procedimiento)}</span></div>
                        </div>
                    </div>
                </a>
            ) : (
                <div className="contract-card">
                    <div className="contract-header"><div className="contract-title">{contracte.descripcion}</div><div className="contract-amount">{formatCurrency(contracte.importe)}</div></div>
                    <div className="contract-meta">
                        <div className="contract-meta-item"><span className="contract-meta-label">Empresa adjudicatària</span><span className="contract-meta-value">{contracte.adjudicatario}</span></div>
                        <div className="contract-meta-item"><span className="contract-meta-label">Data</span><span className="contract-meta-value">{formatDate(contracte.fecha)}</span></div>
                        <div className="contract-meta-item"><span className="contract-meta-label">Codi expedient</span><span className="contract-meta-value">{contracte.codigo}</span></div>
                        <div className="contract-pills"><span className="contract-pill">{formatTipus(contracte.tipo)}</span><span className="contract-pill procedure">{formatProcediment(contracte.procedimiento)}</span></div>
                    </div>
                </div>
            )}
            <div className="contracte-detail-actions-row">
                <button onClick={onBack} className="btn-share contracte-detail-back" title="Tornar" aria-label="Tornar" type="button"><svg className="contracte-detail-back-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg><span>Tornar</span></button>
                <div className={`contracte-detail-share contracte-detail-share-standalone${shareActionsOpen ? ' is-open' : ''}`} ref={shareActionsRef}>
                    <div id="electoralisme-share-actions" className="contracte-detail-share-actions" aria-hidden={!shareActionsOpen}><button className="btn-share contracte-detail-share-btn" onClick={copyElectoralismeLink} tabIndex={shareActionsOpen ? 0 : -1} type="button">{shareCopyStatus || "Copia l'enllaç"}</button></div>
                    <button className="btn-share contracte-detail-share-btn" onClick={() => setShareActionsOpen(open => !open)} aria-expanded={shareActionsOpen} aria-controls="electoralisme-share-actions" type="button"><em className="share-arrow"></em> Compartir</button>
                </div>
            </div>
        </div>
    );
}

/* ---- CasDependenciaView ----------------------------------------- */
function CasDependenciaView({ caso, onBack }) {
    if (!caso) return null;
    const [shareActionsOpen, setShareActionsOpen] = useState(false);
    const [shareCopyStatus, setShareCopyStatus] = useState('');
    const shareActionsRef = useRef(null);
    const shareStatusTimerRef = useRef(null);
    const annualDependenciaStats = useMemo(() => {
        const totalsByYear = {};
        for (const subvencio of caso.subvencions || []) {
            const year = subvencio.año || Number(String(subvencio.fecha || '').slice(0, 4));
            if (!year) continue;
            totalsByYear[year] = (totalsByYear[year] || 0) + (Number(subvencio.importe) || 0);
        }
        const annualTotals = Object.values(totalsByYear);
        return {
            average: annualTotals.length ? caso.import_total / annualTotals.length : 0,
            maximum: annualTotals.length ? Math.max(...annualTotals) : 0,
        };
    }, [caso]);

    useEffect(() => {
        if (!shareActionsOpen) return;
        const closeShareActions = (event) => {
            if (event.type === 'keydown' && event.key !== 'Escape') return;
            if (event.type === 'pointerdown' && shareActionsRef.current?.contains(event.target)) return;
            setShareActionsOpen(false);
        };
        document.addEventListener('pointerdown', closeShareActions);
        document.addEventListener('keydown', closeShareActions);
        return () => {
            document.removeEventListener('pointerdown', closeShareActions);
            document.removeEventListener('keydown', closeShareActions);
        };
    }, [shareActionsOpen]);

    useEffect(() => () => window.clearTimeout(shareStatusTimerRef.current), []);

    const copyDependenciaLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setShareCopyStatus('Enllaç copiat');
        } catch (_) {
            setShareCopyStatus("No s'ha pogut copiar");
        }
        window.clearTimeout(shareStatusTimerRef.current);
        shareStatusTimerRef.current = window.setTimeout(() => setShareCopyStatus(''), 1800);
    };

    return (
        <div className="container analisi-detail-page">
            <h1 className="page-title">Detall de dependència</h1>
            <div className="analisi-detail-hero analisi-case-hero analisi-case-dependencia">
                <div className="analisi-case-amount">{formatCurrency(caso.import_total)}</div>
                <div className="contract-header analisi-case-header analisi-fraccionament-title-row">
                    <h2 className="analisi-case-title-wrap">
                        <a href={buildRouteUrl(`/entitats/${caso.entitat_slug}`)} className="analisi-case-title-link">{caso.entitat}</a>
                    </h2>
                </div>
                <div className="analisi-detail-contract-count">{caso.num_subvencions} subvencions directes</div>
                <div className="contract-pills analisi-detail-hero-pills">
                    <span className={"risk-badge " + riskClass(caso.nivell)}>{riskLabel(caso.nivell)}</span>
                    <span className={"risk-badge " + riskClass(caso.nivell)} style={{ fontVariantNumeric: 'tabular-nums' }}>{caso.risc}/100</span>
                </div>
            </div>

            <div className="analisi-detail-info-card">
                <div className="contract-meta analisi-detail-info-meta analisi-detail-info-meta-dependencia">
                    <div className="contract-meta-item"><span className="contract-meta-label">Període</span><span className="contract-meta-value">Del {formatDate(caso.data_inici)} al {formatDate(caso.data_fi)}</span></div>
                    <div className="contract-meta-item"><span className="contract-meta-label">Mitjana anual</span><span className="contract-meta-value">{formatCurrency(annualDependenciaStats.average)}</span></div>
                    <div className="contract-meta-item"><span className="contract-meta-label">Màxim anual</span><span className="contract-meta-value">{formatCurrency(annualDependenciaStats.maximum)}</span></div>
                </div>
            </div>

            <section className="analisi-detail-section-card" aria-labelledby="dependencia-indicators-title">
                <h2 id="dependencia-indicators-title" className="analisi-detail-section-title">Indicadors</h2>
                <ul className="analisi-detail-text-list">{(caso.motius || []).map(motiu => <li key={motiu}>{motiu}</li>)}</ul>
            </section>

            {(caso.subvencions || []).map(subvencio => (
                <div key={subvencio.id} className="contract-card">
                    <div className="contract-header">
                        <div className="contract-title">{subvencio.descripcion}</div>
                        <div className="contract-amount">{formatCurrency(subvencio.importe)}</div>
                    </div>
                    <div className="contract-meta">
                        <div className="contract-meta-item"><span className="contract-meta-label">Data</span><span className="contract-meta-value">{formatDate(subvencio.fecha)}</span></div>
                        <div className="contract-meta-item"><span className="contract-meta-label">Codi expedient</span><span className="contract-meta-value">{subvencio.codigo}</span></div>
                        <div className="contract-pills"><span className="contract-pill">{formatSubvencioSector(subvencio.finalitat_p_blica)}</span></div>
                    </div>
                </div>
            ))}

            <div className="contracte-detail-actions-row">
                <button onClick={onBack} className="btn-share contracte-detail-back" title="Tornar" aria-label="Tornar" type="button"><svg className="contracte-detail-back-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg><span>Tornar</span></button>
                <div className={`contracte-detail-share contracte-detail-share-standalone${shareActionsOpen ? ' is-open' : ''}`} ref={shareActionsRef}>
                    <div id="dependencia-share-actions" className="contracte-detail-share-actions" aria-hidden={!shareActionsOpen}><button className="btn-share contracte-detail-share-btn" onClick={copyDependenciaLink} tabIndex={shareActionsOpen ? 0 : -1} type="button">{shareCopyStatus || "Copia l'enllaç"}</button></div>
                    <button className="btn-share contracte-detail-share-btn" onClick={() => setShareActionsOpen(open => !open)} aria-expanded={shareActionsOpen} aria-controls="dependencia-share-actions" type="button"><em className="share-arrow"></em> Compartir</button>
                </div>
            </div>
        </div>
    );
}

