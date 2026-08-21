function formatSubvencioSector(finalitat) {
    const sectors = {
        'Serveis Socials i Promoció Social': 'Social',
        'Cultura': 'Cultura',
        'Comerç, Turisme i Pimes': 'Comerç',
        "Accés a l'habitatge i foment de l'edificació": 'Habitatge',
        "Foment de l'Ocupació": 'Ocupació',
        'Cooperació internacional per al desenvolupament i cultural': 'Cooperació',
        'Educació': 'Educació',
        'Sanitat': 'Sanitat',
        'Altres actuacions de caràcter econòmic': 'Economia',
        'Altres Prestacions econòmiques': 'Altres',
    };
    return sectors[finalitat] || 'Altres';
}

function isSubvencioDirecta(subvencio) {
    const text = normalizeSearchText([
        subvencio.objecte_de_la_convocat_ria,
        subvencio.t_tol_convocat_ria_catal,
        subvencio.t_tol_convocat_ria_castell,
        subvencio.discriminador_de_la_concessi,
        subvencio.descripcion,
    ].join(' '));
    return /\bdirect(?:a|e|es)?\b/.test(text);
}

const SUBVENCIO_TIPOLOGIES = [
    'Serveis Socials i Promoció Social',
    'Cultura',
    'Comerç, Turisme i Pimes',
    "Accés a l'habitatge i foment de l'edificació",
    "Foment de l'Ocupació",
    'Cooperació internacional per al desenvolupament i cultural',
    'Educació',
    'Sanitat',
    'Altres actuacions de caràcter econòmic',
    'Altres Prestacions econòmiques',
];

function EntitatView({ entitatSlug, subvencions, onBack }) {
    const allEntitatSubvencions = useMemo(
        () => subvencions.filter(subvencio => subvencio.entitat_slug === entitatSlug),
        [subvencions, entitatSlug]
    );
    const entitatNom = allEntitatSubvencions[0]?.adjudicatario || '';
    const totalImport = allEntitatSubvencions.reduce((sum, subvencio) => sum + (Number(subvencio.importe) || 0), 0);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('date-desc');
    const [tipologiaFilter, setTipologiaFilter] = useState('');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [amountMin, setAmountMin] = useState('');
    const [amountMax, setAmountMax] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [shareActionsOpen, setShareActionsOpen] = useState(false);
    const [shareCopyStatus, setShareCopyStatus] = useState('');
    const shareActionsRef = useRef(null);
    const shareStatusTimerRef = useRef(null);
    const itemsPerPage = 25;

    useEffect(() => setCurrentPage(1), [searchTerm, sortBy, tipologiaFilter, dateStart, dateEnd, amountMin, amountMax]);
    useEffect(() => {
        if (!shareActionsOpen) return;
        const closeShareActions = event => {
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

    const annualActivity = useMemo(() => {
        const byYear = {};
        for (const subvencio of allEntitatSubvencions) {
            const year = subvencio.año || Number(String(subvencio.fecha || '').slice(0, 4));
            if (!year) continue;
            if (!byYear[year]) byYear[year] = { year, amount: 0, count: 0 };
            byYear[year].amount += Number(subvencio.importe) || 0;
            byYear[year].count += 1;
        }
        const items = Object.values(byYear).sort((a, b) => a.year - b.year);
        const maxAmount = items.reduce((max, item) => Math.max(max, item.amount), 0);
        const firstYear = items[0]?.year;
        const lastYear = items[items.length - 1]?.year;
        return {
            items,
            maxAmount,
            period: firstYear ? (firstYear === lastYear ? String(firstYear) : `${firstYear}–${lastYear}`) : '—',
        };
    }, [allEntitatSubvencions]);

    const principalSector = useMemo(() => {
        const sectors = {};
        for (const subvencio of allEntitatSubvencions) {
            const finalitat = subvencio.finalitat_p_blica;
            if (!finalitat) continue;
            if (!sectors[finalitat]) sectors[finalitat] = { count: 0, amount: 0 };
            sectors[finalitat].count += 1;
            sectors[finalitat].amount += Number(subvencio.importe) || 0;
        }
        return Object.entries(sectors)
            .sort(([, a], [, b]) => b.count - a.count || b.amount - a.amount)[0]?.[0] || '';
    }, [allEntitatSubvencions]);

    const concessionTypeStats = useMemo(() => {
        const directes = allEntitatSubvencions.filter(isSubvencioDirecta).length;
        const totals = allEntitatSubvencions.length;
        return {
            directes,
            indirectes: totals - directes,
            percentatgeDirectes: totals ? directes / totals : 0,
        };
    }, [allEntitatSubvencions]);

    const filteredSubvencions = useMemo(() => {
        const result = allEntitatSubvencions.filter(subvencio => {
            if (searchTerm && !matchesSearchQuery([subvencio.descripcion, subvencio.adjudicatario, subvencio.codigo], searchTerm)) return false;
            if (tipologiaFilter && subvencio.finalitat_p_blica !== tipologiaFilter) return false;
            if (dateStart && subvencio.fecha < dateStart) return false;
            if (dateEnd && subvencio.fecha > dateEnd) return false;
            if (amountMin !== '' && subvencio.importe < Number(amountMin)) return false;
            if (amountMax !== '' && subvencio.importe > Number(amountMax)) return false;
            return true;
        });
        return result.sort((a, b) => {
            if (sortBy === 'date-asc') return (Date.parse(a.fecha) || 0) - (Date.parse(b.fecha) || 0);
            if (sortBy === 'amount-desc') return b.importe - a.importe;
            if (sortBy === 'amount-asc') return a.importe - b.importe;
            return (Date.parse(b.fecha) || 0) - (Date.parse(a.fecha) || 0);
        });
    }, [allEntitatSubvencions, searchTerm, sortBy, tipologiaFilter, dateStart, dateEnd, amountMin, amountMax]);

    const totalPages = Math.ceil(filteredSubvencions.length / itemsPerPage);
    const pageSubvencions = filteredSubvencions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const resetFilters = () => {
        setSearchTerm('');
        setSortBy('date-desc');
        setTipologiaFilter('');
        setDateStart('');
        setDateEnd('');
        setAmountMin('');
        setAmountMax('');
        setCurrentPage(1);
    };
    const activeFiltersCount = [tipologiaFilter, dateStart, dateEnd, amountMin, amountMax, sortBy !== 'date-desc' ? sortBy : ''].filter(Boolean).length;
    const copyEntitatLink = async () => {
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
        <div className="container empresa-detail-page entitat-detail-page">
            <h1 className="page-title">Detall d'entitat</h1>
            <div className="empresa-detail-hero">
                <div className="empresa-detail-amount">{formatCurrency(totalImport)}</div>
                <div className="contract-header empresa-detail-title-row">
                    <h2 className="empresa-detail-title">{entitatNom}</h2>
                </div>
                <div className="empresa-detail-contract-count">{allEntitatSubvencions.length} subvencions</div>
            </div>
            <div className="empresa-detail-info-card">
                <div className="contract-meta empresa-detail-info-meta entitat-detail-info-meta">
                    {principalSector && (
                        <div className="contract-meta-item">
                            <span className="contract-meta-label">Sector</span>
                            <span className="contract-meta-value">{formatSubvencioSector(principalSector)}</span>
                        </div>
                    )}
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">Període</span>
                        <span className="contract-meta-value">{annualActivity.period}</span>
                    </div>
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">Subvencions directes</span>
                        <span className="contract-meta-value">{concessionTypeStats.directes} ({formatPercent(concessionTypeStats.percentatgeDirectes)})</span>
                    </div>
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">Altres subvencions</span>
                        <span className="contract-meta-value">{concessionTypeStats.indirectes} ({formatPercent(1 - concessionTypeStats.percentatgeDirectes)})</span>
                    </div>
                </div>
            </div>
            {annualActivity.items.length > 1 && (
                <div className="empresa-activity-visual" aria-label="Històric anual de les subvencions concedides a aquesta entitat">
                    <div className="empresa-activity-header">
                        <h3 className="empresa-activity-title">Històric de subvencions</h3>
                    </div>
                    <div className="empresa-activity-bars">
                        {annualActivity.items.map(item => (
                            <div key={item.year} className="empresa-activity-column">
                                <div className="empresa-activity-bar-wrap" aria-hidden="true">
                                    <span style={{ height: `${Math.max(4, Math.round((item.amount / annualActivity.maxAmount) * 100))}%`, '--bar-width': `${Math.max(4, Math.round((item.amount / annualActivity.maxAmount) * 100))}%` }}></span>
                                </div>
                                <div className="empresa-activity-meta">
                                    <span>{item.year}</span>
                                    <small>{formatCurrency(item.amount)}</small>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="search-section empresa-detail-contract-search">
                <SearchField value={searchTerm} onValueChange={setSearchTerm} placeholder="Cerca per descripció o codi d'expedient" ariaLabel="Cerca per descripció o codi d'expedient" />
                <FilterActions open={filtersOpen} onToggle={() => setFiltersOpen(open => !open)} activeCount={activeFiltersCount} onReset={resetFilters} />
                <div className={'filters search-filter-panel subvencio-filter-primary' + (!filtersOpen ? ' collapsed' : '')}>
                    <div className="filter-group filter-group-standard">
                        <label className="filter-label">Ordenar per</label>
                        <select className="filter-select filter-select-standard" value={sortBy} onChange={event => setSortBy(event.target.value)} aria-label="Ordenar subvencions de l'entitat per">
                            <option value="date-desc">Data (més recents)</option>
                            <option value="date-asc">Data (més antics)</option>
                            <option value="amount-desc">Import (descendent)</option>
                            <option value="amount-asc">Import (ascendent)</option>
                        </select>
                    </div>
                    <div className="filter-group filter-group-standard">
                        <label className="filter-label">Tipus</label>
                        <select className="filter-select filter-select-standard" value={tipologiaFilter} onChange={event => setTipologiaFilter(event.target.value)} aria-label="Tipus de subvenció">
                            <option value="">Tots els tipus</option>
                            {SUBVENCIO_TIPOLOGIES.map(tipologia => (
                                <option key={tipologia} value={tipologia}>{formatSubvencioSector(tipologia)}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className={'filters-row search-filter-panel search-filter-panel-secondary' + (!filtersOpen ? ' collapsed' : '')}>
                    <div className="filter-group"><label className="filter-label">Data inici</label><input type="date" className="filter-input" value={dateStart} onChange={event => setDateStart(event.target.value)} /></div>
                    <div className="filter-group"><label className="filter-label">Data final</label><input type="date" className="filter-input" value={dateEnd} onChange={event => setDateEnd(event.target.value)} /></div>
                    <div className="filter-group"><label className="filter-label">Des de</label><input type="number" min="0" step="0.01" inputMode="decimal" className="filter-input" placeholder="Import mínim" value={amountMin} onChange={event => setAmountMin(event.target.value)} /></div>
                    <div className="filter-group"><label className="filter-label">Fins a</label><input type="number" min="0" step="0.01" inputMode="decimal" className="filter-input" placeholder="Import màxim" value={amountMax} onChange={event => setAmountMax(event.target.value)} /></div>
                </div>
            </div>
            <div className="results-count" role="status" aria-live="polite">
                <span className="results-count-total"><span className="results-count-prefix">S'han trobat </span><strong>{filteredSubvencions.length}</strong> subvencions</span>
            </div>
            {pageSubvencions.map(subvencio => (
                <div key={subvencio.id} className="contract-card subvencio-card">
                    <span className="contract-header"><span className="contract-title">{subvencio.descripcion}</span><span className="contract-amount">{formatCurrency(subvencio.importe)}</span></span>
                    <span className="contract-meta">
                        <span className="contract-meta-item"><span className="contract-meta-label">Entitat adjudicatària</span><span className="contract-meta-value">{subvencio.adjudicatario}</span></span>
                        <span className="contract-meta-item"><span className="contract-meta-label">Data</span><span className="contract-meta-value">{formatDate(subvencio.fecha)}</span></span>
                        <span className="contract-meta-item"><span className="contract-meta-label">Codi expedient</span><span className="contract-meta-value">{subvencio.codigo || '—'}</span></span>
                        <span className="contract-pills">
                            <span className="contract-pill" title={subvencio.finalitat_p_blica} aria-label={`Finalitat pública: ${subvencio.finalitat_p_blica}`}>
                                {formatSubvencioSector(subvencio.finalitat_p_blica)}
                            </span>
                        </span>
                    </span>
                </div>
            ))}
            {filteredSubvencions.length === 0 && <EmptySearchState text="No s'han trobat subvencions." onReset={resetFilters} />}
            {filteredSubvencions.length > itemsPerPage && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
            <div className="empresa-detail-actions-row contracte-detail-actions-row">
                <button onClick={onBack} className="btn-share empresa-detail-back contracte-detail-back" title="Tornar" aria-label="Tornar" type="button">
                    <svg className="contracte-detail-back-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg><span>Tornar</span>
                </button>
                <div className={`contracte-detail-share contracte-detail-share-standalone${shareActionsOpen ? ' is-open' : ''}`} ref={shareActionsRef}>
                    <div id="entitat-share-actions" className="contracte-detail-share-actions" aria-hidden={!shareActionsOpen}>
                        <button className="btn-share contracte-detail-share-btn" onClick={copyEntitatLink} tabIndex={shareActionsOpen ? 0 : -1} type="button">{shareCopyStatus || "Copia l'enllaç"}</button>
                    </div>
                    <button className="btn-share contracte-detail-share-btn" onClick={() => setShareActionsOpen(open => !open)} aria-expanded={shareActionsOpen} aria-controls="entitat-share-actions" type="button"><em className="share-arrow"></em> Compartir</button>
                </div>
            </div>
        </div>
    );
}

/* ---- PersonesView (beginning — merges with existing file end) ---- */

function SubvencionsView({ subvencions, onEntitatSelect }) {
    const loading = false;
    const error = false;
    const [searchTerm, setSearchTerm] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [sortBy, setSortBy] = useState('date-desc');
    const [tipologiaFilter, setTipologiaFilter] = useState('');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [amountMin, setAmountMin] = useState('');
    const [amountMax, setAmountMax] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 25;

    const filteredSubvencions = useMemo(() => {
        const filtered = subvencions.filter(subvencio => {
            if (searchTerm && !matchesSearchQuery([subvencio.descripcion, subvencio.adjudicatario, subvencio.codigo], searchTerm)) return false;
            if (tipologiaFilter && subvencio.finalitat_p_blica !== tipologiaFilter) return false;
            if (dateStart && subvencio.fecha < dateStart) return false;
            if (dateEnd && subvencio.fecha > dateEnd) return false;
            if (amountMin !== '' && subvencio.importe < Number(amountMin)) return false;
            if (amountMax !== '' && subvencio.importe > Number(amountMax)) return false;
            return true;
        });

        return filtered.sort((a, b) => {
            if (sortBy === 'date-asc') return (Date.parse(a.fecha) || 0) - (Date.parse(b.fecha) || 0);
            if (sortBy === 'amount-desc') return b.importe - a.importe;
            if (sortBy === 'amount-asc') return a.importe - b.importe;
            return (Date.parse(b.fecha) || 0) - (Date.parse(a.fecha) || 0);
        });
    }, [subvencions, searchTerm, tipologiaFilter, dateStart, dateEnd, amountMin, amountMax, sortBy]);

    const totalPages = Math.ceil(filteredSubvencions.length / itemsPerPage);
    const pageSubvencions = filteredSubvencions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const activeFiltersCount = [tipologiaFilter, dateStart, dateEnd, amountMin, amountMax].filter(value => value !== '').length + (sortBy !== 'date-desc' ? 1 : 0);

    useEffect(() => {
        const lastPage = Math.max(1, totalPages);
        if (currentPage > lastPage) setCurrentPage(lastPage);
    }, [currentPage, totalPages]);

    const resetFilters = () => {
        setSearchTerm('');
        setSortBy('date-desc');
        setTipologiaFilter('');
        setDateStart('');
        setDateEnd('');
        setAmountMin('');
        setAmountMax('');
        setCurrentPage(1);
    };

    return (
        <div className="container subvencions-page">
            <h1 className="page-title">Cercador de subvencions</h1>

            {loading && (
                <div className="data-loading-container" role="status" aria-live="polite" aria-label="Carregant subvencions">
                    <div className="search-section data-skeleton-search" aria-hidden="true">
                        <div className="data-skeleton-input"></div>
                        <div className="data-skeleton-actions">
                            <div className="data-skeleton-control"></div>
                            <div className="data-skeleton-control data-skeleton-control-square"></div>
                        </div>
                    </div>
                    <div className="data-skeleton-list" aria-hidden="true">
                        {Array.from({ length: 4 }, (_, index) => (
                            <div key={index} className="contract-card data-skeleton-card">
                                <div className="data-skeleton-line data-skeleton-line-title"></div>
                                <div className="data-skeleton-line data-skeleton-line-medium"></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!loading && error && (
                <div className="empty-state" role="alert">
                    <div className="empty-state-icon" aria-hidden="true">!</div>
                    <div className="empty-state-title">No s'han pogut carregar les subvencions</div>
                    <div className="empty-state-text">La connexió amb el RAISC no està disponible ara mateix.</div>
                    <div className="empty-state-action">
                        <button className="empty-state-btn" type="button">Tornar-ho a provar</button>
                    </div>
                </div>
            )}

            {!loading && !error && (
                <>
                    <div className="search-section">
                        <SearchField
                            value={searchTerm}
                            onValueChange={value => { setSearchTerm(value); setCurrentPage(1); }}
                            placeholder="Cerca per descripció, entitat o codi d'expedient"
                            ariaLabel="Cerca per descripció, entitat o codi d'expedient"
                        />

                        <FilterActions
                            open={filtersOpen}
                            onToggle={() => setFiltersOpen(open => !open)}
                            activeCount={activeFiltersCount}
                            onReset={resetFilters}
                            controlsId="subvencio-filter-primary subvencio-filter-secondary"
                        />

                        <div id="subvencio-filter-primary" className={'filters search-filter-panel subvencio-filter-primary' + (!filtersOpen ? ' collapsed' : '')}>
                            <div className="filter-group filter-group-standard">
                                <label className="filter-label">Ordenar per</label>
                                <select className="filter-select filter-select-standard" value={sortBy} onChange={event => { setSortBy(event.target.value); setCurrentPage(1); }} aria-label="Ordenar subvencions per">
                                    <option value="date-desc">Data (més recents)</option>
                                    <option value="date-asc">Data (més antics)</option>
                                    <option value="amount-desc">Import (descendent)</option>
                                    <option value="amount-asc">Import (ascendent)</option>
                                </select>
                            </div>
                            <div className="filter-group filter-group-standard">
                                <label className="filter-label">Tipus</label>
                                <select className="filter-select filter-select-standard" value={tipologiaFilter} onChange={event => { setTipologiaFilter(event.target.value); setCurrentPage(1); }} aria-label="Tipus de subvenció">
                                    <option value="">Tots els tipus</option>
                                    {SUBVENCIO_TIPOLOGIES.map(tipologia => (
                                        <option key={tipologia} value={tipologia}>{formatSubvencioSector(tipologia)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div id="subvencio-filter-secondary" className={'filters-row search-filter-panel search-filter-panel-secondary' + (!filtersOpen ? ' collapsed' : '')}>
                            <div className="filter-group">
                                <label className="filter-label">Data inici</label>
                                <input type="date" className="filter-input" aria-label="Data inici" value={dateStart} onChange={event => { setDateStart(event.target.value); setCurrentPage(1); }} />
                            </div>
                            <div className="filter-group">
                                <label className="filter-label">Data final</label>
                                <input type="date" className="filter-input" aria-label="Data final" value={dateEnd} onChange={event => { setDateEnd(event.target.value); setCurrentPage(1); }} />
                            </div>
                            <div className="filter-group">
                                <label className="filter-label">Des de</label>
                                <input type="number" min="0" step="0.01" inputMode="decimal" className="filter-input" placeholder="Import mínim" aria-label="Import mínim" value={amountMin} onChange={event => { setAmountMin(event.target.value); setCurrentPage(1); }} />
                            </div>
                            <div className="filter-group">
                                <label className="filter-label">Fins a</label>
                                <input type="number" min="0" step="0.01" inputMode="decimal" className="filter-input" placeholder="Import màxim" aria-label="Import màxim" value={amountMax} onChange={event => { setAmountMax(event.target.value); setCurrentPage(1); }} />
                            </div>
                        </div>
                    </div>

                    <div className="results-count" role="status" aria-live="polite">
                        <span className="results-count-total"><span className="results-count-prefix">S'han trobat </span><strong>{filteredSubvencions.length}</strong> subvencions</span>
                        {filteredSubvencions.length > itemsPerPage && (
                            <span className="results-count-page"><span className="results-count-page-full">Pàgina</span><span className="results-count-page-short">Pàg.</span> <strong>{currentPage}</strong> de <strong>{totalPages}</strong></span>
                        )}
                    </div>

                    {pageSubvencions.map(subvencio => (
                        <a
                            key={subvencio.id}
                            href={buildRouteUrl(`/entitats/${subvencio.entitat_slug}`)}
                            className="contract-card subvencio-card"
                            onClick={event => handleInternalLinkClick(event, () => onEntitatSelect(subvencio))}
                        >
                            <span className="contract-header">
                                <span className="contract-title">{subvencio.descripcion}</span>
                                <span className="contract-amount">{formatCurrency(subvencio.importe)}</span>
                            </span>
                            <span className="contract-meta">
                                <span className="contract-meta-item">
                                    <span className="contract-meta-label">Entitat adjudicatària</span>
                                    <span className="contract-meta-value">{subvencio.adjudicatario}</span>
                                </span>
                                <span className="contract-meta-item">
                                    <span className="contract-meta-label">Data</span>
                                    <span className="contract-meta-value">{formatDate(subvencio.fecha)}</span>
                                </span>
                                <span className="contract-meta-item">
                                    <span className="contract-meta-label">Codi expedient</span>
                                    <span className="contract-meta-value">{subvencio.codigo}</span>
                                </span>
                                <span className="contract-pills">
                                    <span className="contract-pill" title={subvencio.finalitat_p_blica} aria-label={`Finalitat pública: ${subvencio.finalitat_p_blica}`}>
                                        {formatSubvencioSector(subvencio.finalitat_p_blica)}
                                    </span>
                                </span>
                            </span>
                        </a>
                    ))}

                    {filteredSubvencions.length === 0 && (
                        <EmptySearchState text="No s'han trobat subvencions." onReset={resetFilters} />
                    )}

                    {filteredSubvencions.length > itemsPerPage && (
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    )}

                    <div className="metodologia-wrapper">
                        <div className="metodologia">
                            <h3 className="metodologia-legal-title">Metodologia</h3>
                            <p className="metodologia-intro">
                                Les subvencions que apareixen en aquest cercador corresponen a les concessions publicades al Registre d'Ajuts i Subvencions de Catalunya (RAISC).
                            </p>
                            <p className="metodologia-intro">
                                L'import que figura a cada subvenció és la quantitat concedida publicada oficialment. La interfície mostra únicament els registres amb beneficiaris identificats com a entitats publicables, pel que les concessions associades a persones físiques o a beneficiaris no publicables no apareixen al cercador.
                            </p>
                            <p className="metodologia-intro">
                                El tractament de les dades es realitza a l'empara de l'article 6.1.e) del Reglament UE 2016/679 (RGPD) d'interès públic i de la Llei 19/2013, de 9 de desembre, de transparència, accés a la informació pública i bon govern, que estableix l'obligació de publicitat activa en matèria de contractació pública. Les dades es limiten a la informació estrictament necessària per al propòsit de transparència i es tracten d'acord amb el principi de minimització de dades (art. 5.1.c RGPD). Tota la informació publicada prové de fonts oficials de caràcter públic i no inclou dades de la vida privada de les persones.
                            </p>
                            <p className="metodologia-intro metodologia-intro-last">
                                Les persones interessades poden exercir els drets d'accés, rectificació, limitació o oposició al tractament posant-se en contacte a través de la secció <a href="/avis-legal" className="prose-link">Avís legal</a>. El dret de supressió (dret a l'oblit) queda limitat per l'art. 17.3.b) del RGPD quan les dades figuren en registres oficials públics o en documentació administrativa de contractació pública, sense perjudici del dret a sol·licitar la revisió de possibles errors factuals.
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

