function EmpresesView({ empreses, onEmpresaSelect, searchTerm, setSearchTerm, sectorFilter, setSectorFilter, categoriaFilter, setCategoriaFilter, sortBy, setSortBy, currentPage, setCurrentPage }) {
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
    const [empresesFiltersOpen, setEmpresesFiltersOpen] = useState(false);
    const itemsPerPage = 24;

    const resetFilters = () => {
        setSearchTerm('');
        setDebouncedSearch('');
        setSectorFilter('');
        setCategoriaFilter('');
        setSortBy('amount-desc');
        setCurrentPage(1);
    };

    const categoriesForSector = useMemo(() => {
        if (!sectorFilter) return [];
        const cats = new Set();
        empreses.forEach(e => {
            if (e.sector === sectorFilter && e.categoria) {
                cats.add(e.categoria);
            }
        });
        return Array.from(cats).sort();
    }, [empreses, sectorFilter]);

    const allSectors = useMemo(() => {
        const s = new Set();
        empreses.forEach(e => {
            if (e.sector) s.add(e.sector);
        });
        return Array.from(s).sort();
    }, [empreses]);

    // Removed useEffect that resets categoriaFilter because it runs on mount and any sector change and causes race conditions when rendering.
    // Reset is now handled explicitly in the onClick for the select.

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, sectorFilter, categoriaFilter, sortBy]);

    const empresesFiltrades = useMemo(() => {
        let result = [...empreses];

        if (debouncedSearch) {
            result = result.filter(e => matchesSearchQuery(e.nom, debouncedSearch));
        }

        if (sectorFilter) {
            result = result.filter(e => e.sector === sectorFilter);
        }

        if (categoriaFilter) {
            result = result.filter(e => e.categoria === categoriaFilter);
        }

        switch (sortBy) {
            case 'amount-desc':
                result.sort((a, b) => b.total_importe - a.total_importe);
                break;
            case 'amount-asc':
                result.sort((a, b) => a.total_importe - b.total_importe);
                break;
            case 'contracts-desc':
                result.sort((a, b) => b.num_contratos - a.num_contratos);
                break;
            case 'contracts-asc':
                result.sort((a, b) => a.num_contratos - b.num_contratos);
                break;
            default:
                result.sort((a, b) => b.total_importe - a.total_importe);
        }

        return result;
    }, [empreses, debouncedSearch, sectorFilter, categoriaFilter, sortBy]);

    const totalPages = Math.ceil(empresesFiltrades.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const empresesPaginades = empresesFiltrades.slice(startIndex, endIndex);
    const activeFiltersCount = [
        sectorFilter,
        categoriaFilter,
        sortBy !== 'amount-desc' ? sortBy : ''
    ].filter(Boolean).length;

    return (
        <div className="container empreses-page">
            <h1 className="page-title">Cercador d'empreses</h1>
            <div className="search-section">
                <SearchField
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                    placeholder="Cerca per empresa"
                    ariaLabel="Cerca per empresa"
                />

                <FilterActions
                    open={empresesFiltersOpen}
                    onToggle={() => setEmpresesFiltersOpen(prev => !prev)}
                    activeCount={activeFiltersCount}
                    onReset={resetFilters}
                />

                <div className={"filters search-filter-panel" + (!empresesFiltersOpen ? " collapsed" : "")}>
                    <div className="filter-group filter-group-standard">
                        <label className="filter-label">Ordenar per</label>
                        <select className="filter-select filter-select-standard" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Ordenar empreses per">
                            <option value="amount-desc">Import (descendent)</option>
                            <option value="amount-asc">Import (ascendent)</option>
                            <option value="contracts-desc">Nombre de contractes (descendent)</option>
                            <option value="contracts-asc">Nombre de contractes (ascendent)</option>
                        </select>
                    </div>
                    <div className="filter-group filter-group-standard">
                        <label className="filter-label">Sector</label>
                        <select className="filter-select filter-select-standard" value={sectorFilter} onChange={(e) => { setSectorFilter(e.target.value); setCategoriaFilter(''); }} aria-label="Sector">
                            <option value="">Tots els sectors</option>
                            {allSectors
                                .slice()
                                .sort((a, b) => {
                                    if (a === 'Altres Serveis i Subministraments') return 1;
                                    if (b === 'Altres Serveis i Subministraments') return -1;
                                    return a.localeCompare(b, 'ca');
                                })
                                .map(sec => (
                                    <option key={sec} value={sec}>{sec === 'Altres Serveis i Subministraments' ? 'Altres' : sec}</option>
                                ))}
                        </select>
                    </div>
                    <div className="filter-group filter-group-standard">
                        <label className="filter-label">Categoria</label>
                        <select className="filter-select filter-select-standard" value={categoriaFilter} onChange={(e) => setCategoriaFilter(e.target.value)} disabled={!sectorFilter} aria-label="Categoria">
                            <option value="">{sectorFilter ? 'Totes les categories' : 'Selecciona un sector'}</option>
                            {categoriesForSector
                                .slice()
                                .sort((a, b) => {
                                    if (a === 'Altres serveis comunitaris') return 1;
                                    if (b === 'Altres serveis comunitaris') return -1;
                                    return a.localeCompare(b, 'ca');
                                })
                                .map(cat => (
                                    <option key={cat} value={cat}>{cat === 'Altres serveis comunitaris' ? 'Altres' : cat}</option>
                                ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="results-count">
                <span className="results-count-total"><span className="results-count-prefix">S'han trobat </span><strong>{empresesFiltrades.length}</strong> empreses</span>
                {empresesFiltrades.length > itemsPerPage && (
                    <span className="results-count-page"><span className="results-count-page-full">Pàgina</span><span className="results-count-page-short">Pàg.</span> <strong>{currentPage}</strong> de <strong>{totalPages}</strong></span>
                )}
            </div>

            <div>
                {empresesPaginades.map(e => (
                    <a
                        key={e.nom}
                        href={buildRouteUrl(e.slug ? `/empreses/${e.slug}` : '/empreses')}
                        className="card-link-wrapper"
                        onClick={(event) => handleInternalLinkClick(event, () => onEmpresaSelect(e.nom))}
                    >
                        <div className="contract-card empresa-list-card">
                            <div className="contract-header">
                                <div className="contract-title">{e.nom}</div>
                                <div className="contract-amount">{formatCurrency(e.total_importe)}</div>
                                <div className="contract-pills empresa-mobile-title-pills">
                                    <span className="contract-pill">{e.num_contratos} contractes</span>
                                </div>
                            </div>
                            <div className="contract-meta">
                                {e.sector && (
                                    <div className="contract-meta-item empresa-list-sector">
                                        <span className="contract-meta-label">Sector</span>
                                        <span className="contract-meta-value">{e.sector}</span>
                                    </div>
                                )}
                                {e.categoria && (
                                    <div className="contract-meta-item empresa-list-category">
                                        <span className="contract-meta-label">Categoria</span>
                                        <span className="contract-meta-value">{e.categoria}</span>
                                    </div>
                                )}
                                <div className="contract-pills empresa-list-title-pills">
                                    <span className="contract-pill">{e.num_contratos} contractes</span>
                                </div>
                            </div>
                        </div>
                    </a>
                ))}
            </div>

            {empresesFiltrades.length === 0 && (
                <EmptySearchState text="No s'han trobat empreses." onReset={resetFilters} />
            )}

            {empresesFiltrades.length > itemsPerPage && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            )}

            <div className="metodologia-wrapper">
                <div className="metodologia">
                    <h3 className="metodologia-legal-title">Metodologia</h3>
                    <p className="metodologia-intro">
                        Les empreses que apareixen en aquest cercador han estat adjudicatàries d'un o més contractes per part de {AUTHORITY_NAME}, segons les dades publicades al Registre Públic de Contractes de la Generalitat de Catalunya.
                    </p>
                    <p className="metodologia-intro">
                        L'import total que figura al costat de cada empresa correspon a la suma dels valors d'adjudicació de tots els contractes que li han estat atorgats. Aparèixer en aquest llistat no implica cap irregularitat, sinó que reflecteix la informació pública disponible sobre la contractació municipal. Les dades poden contenir errors derivats de fonts públiques o processos automatitzats, i qualsevol correcció factual serà revisada.
                    </p>
                    <p className="metodologia-intro">
                        El tractament de les dades es realitza a l'empara de l'article 6.1.e) del Reglament UE 2016/679 (RGPD) d'interès públic i de la Llei 19/2013, de 9 de desembre, de transparència, accés a la informació pública i bon govern, que estableix l'obligació de publicitat activa en matèria de contractació pública. Les dades es limiten a la informació estrictament necessària per al propòsit de transparència i es tracten d'acord amb el principi de minimització de dades (art. 5.1.c RGPD). Tota la informació publicada prové de fonts oficials de caràcter públic i no inclou dades de la vida privada de les persones.
                    </p>
                    <p className="metodologia-intro metodologia-intro-last">
                        Les empreses i persones interessades poden exercir els drets d'accés, rectificació, limitació o oposició al tractament posant-se en contacte a través de la secció <a href="/avis-legal" className="prose-link">Avís legal</a>. El dret de supressió (dret a l'oblit) queda limitat per l'art. 17.3.b) del RGPD quan les dades figuren en registres oficials públics o en documentació administrativa de contractació pública, sense perjudici del dret a sol·licitar la revisió de possibles errors factuals.
                    </p>
                </div>
            </div>
        </div>
    );
}

function EmpresaView({ empresa: empresaNom, contracts, empreses, administradors, onBack, onContractSelect }) {
    const administradorsEmpresa = (administradors && administradors[empresaNom]) || [];
    const empresaData = empreses.find(e => e.nom === empresaNom);
    const allEmpresaContracts = useMemo(() =>
        contracts.filter(c => c.adjudicatario === empresaNom)
        , [contracts, empresaNom]);
    const totalImport = allEmpresaContracts.reduce((sum, c) => sum + c.importe, 0);

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [tipusFilter, setTipusFilter] = useState('');
    const [procedureFilter, setProcedureFilter] = useState('');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [amountMin, setAmountMin] = useState('');
    const [amountMax, setAmountMax] = useState('');
    const [sortBy, setSortBy] = useState('date-desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [showAllAdministradors, setShowAllAdministradors] = useState(false);
    const [empresaFiltersOpen, setEmpresaFiltersOpen] = useState(false);
    const [shareActionsOpen, setShareActionsOpen] = useState(false);
    const [shareCopyStatus, setShareCopyStatus] = useState('');
    const shareActionsRef = useRef(null);
    const shareStatusTimerRef = useRef(null);
    const itemsPerPage = 25;
    const maxAdministradorsInitial = isMobile() ? 5 : 10;
    const administradorsVisibles = administradorsEmpresa.slice(0, maxAdministradorsInitial);
    const administradorsExtres = administradorsEmpresa.slice(maxAdministradorsInitial);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, tipusFilter, procedureFilter, dateStart, dateEnd, amountMin, amountMax, sortBy]);
    useEffect(() => { setShowAllAdministradors(false); }, [empresaNom]);
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

    const empresaContracts = useMemo(() => {
        let result = [...allEmpresaContracts];
        if (debouncedSearch) {
            result = filterContractsBySearch(
                result,
                debouncedSearch,
                c => [c.descripcion, c.adjudicatario, c.codigo]
            );
        }
        if (tipusFilter) result = result.filter(c => c.tipo === tipusFilter);
        if (procedureFilter) result = result.filter(c => c.procedimiento === procedureFilter);
        if (dateStart) result = result.filter(c => new Date(c.fecha) >= new Date(dateStart));
        if (dateEnd) result = result.filter(c => new Date(c.fecha) <= new Date(dateEnd));
        if (amountMin !== '') result = result.filter(c => Number(c.importe) >= Number(amountMin));
        if (amountMax !== '') result = result.filter(c => Number(c.importe) <= Number(amountMax));
        if (sortBy === 'date-desc') result.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        else if (sortBy === 'date-asc') result.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        else if (sortBy === 'amount-desc') result.sort((a, b) => b.importe - a.importe);
        else if (sortBy === 'amount-asc') result.sort((a, b) => a.importe - b.importe);
        return result;
    }, [allEmpresaContracts, debouncedSearch, tipusFilter, procedureFilter, dateStart, dateEnd, amountMin, amountMax, sortBy]);

    const empresaAnnualActivity = useMemo(() => {
        const byYear = {};
        for (const c of allEmpresaContracts) {
            const year = c.año || (c.fecha ? parseInt(String(c.fecha).slice(0, 4), 10) : null);
            if (!year) continue;
            if (!byYear[year]) byYear[year] = { year, amount: 0, count: 0 };
            byYear[year].amount += Number(c.importe) || 0;
            byYear[year].count += 1;
        }
        const items = Object.values(byYear).sort((a, b) => a.year - b.year);
        const maxAmount = items.reduce((max, item) => Math.max(max, item.amount), 0);
        const firstYear = items[0]?.year;
        const lastYear = items[items.length - 1]?.year;
        const period = firstYear ? (firstYear === lastYear ? String(firstYear) : `${firstYear}–${lastYear}`) : '—';
        return { items, maxAmount, period };
    }, [allEmpresaContracts]);

    const totalPages = Math.ceil(empresaContracts.length / itemsPerPage);
    const contractesPaginats = empresaContracts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const resetFilters = () => {
        setSearchTerm('');
        setDebouncedSearch('');
        setTipusFilter('');
        setProcedureFilter('');
        setDateStart('');
        setDateEnd('');
        setAmountMin('');
        setAmountMax('');
        setSortBy('date-desc');
        setCurrentPage(1);
    };
    const activeFiltersCount = [
        tipusFilter,
        procedureFilter,
        dateStart,
        dateEnd,
        amountMin,
        amountMax,
        sortBy !== 'date-desc' ? sortBy : ''
    ].filter(Boolean).length;

    const copyEmpresaLink = async () => {
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
        <div className="container empresa-detail-page">
            <h1 className="page-title">Detall d'empresa</h1>
            <div className="empresa-detail-hero">
                <div className="empresa-detail-amount">{formatCurrency(totalImport)}</div>
                <div className="contract-header empresa-detail-title-row">
                    <h2 className="empresa-detail-title">{empresaNom}</h2>
                </div>
                <div className="empresa-detail-contract-count">{allEmpresaContracts.length} contractes</div>
            </div>
            <div className="empresa-detail-info-card">
                <div className="contract-meta empresa-detail-info-meta">
                    {empresaData?.sector && (
                        <div className="contract-meta-item">
                            <span className="contract-meta-label">Sector</span>
                            <span className="contract-meta-value">{empresaData.sector}</span>
                        </div>
                    )}
                    {empresaData?.categoria && (
                        <div className="contract-meta-item">
                            <span className="contract-meta-label">Categoria</span>
                            <span className="contract-meta-value">{empresaData.categoria}</span>
                        </div>
                    )}
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">Període</span>
                        <span className="contract-meta-value">{empresaAnnualActivity.period}</span>
                    </div>
                </div>
            </div>
            {administradorsEmpresa.length > 0 && (
                <section className="empresa-detail-cargos" aria-labelledby="empresa-cargos-title">
                    <h2 id="empresa-cargos-title" className="empresa-detail-cargos-title">Càrrecs actius</h2>
                    <ul className="empresa-detail-cargos-list">
                        {administradorsVisibles.map((a, i) => (
                            <li key={i} className="empresa-detail-cargo-item">
                                <span className="empresa-detail-cargo-name">{a.nombre}</span>
                                <span className="empresa-detail-cargo-meta">{a.cargo}<span>{a.fecha_nombramiento}</span></span>
                            </li>
                        ))}
                        {administradorsEmpresa.length > maxAdministradorsInitial && (
                            <li className="empresa-detail-cargos-more">
                                <div className={"empresa-detail-cargos-more-panel" + (showAllAdministradors ? " is-open" : "")}>
                                    <div>
                                        <ul className="empresa-detail-cargos-list">
                                            {administradorsExtres.map((a, i) => (
                                                <li key={i} className="empresa-detail-cargo-item">
                                                    <span className="empresa-detail-cargo-name">{a.nombre}</span>
                                                    <span className="empresa-detail-cargo-meta">{a.cargo}<span>{a.fecha_nombramiento}</span></span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowAllAdministradors(v => !v)}
                                    className={"empresa-detail-cargos-toggle" + (showAllAdministradors ? " is-open" : "")}
                                >
                                    {showAllAdministradors ? 'Veure menys' : 'Veure tots'}
                                </button>
                            </li>
                        )}
                    </ul>
                </section>
            )}
            {empresaAnnualActivity.items.length > 1 && (
                <div className="empresa-activity-visual" aria-label="Històric anual de l'import adjudicat a aquesta empresa">
                    <div className="empresa-activity-header">
                        <h3 className="empresa-activity-title">Històric de contractes</h3>
                    </div>

                    <div className="empresa-activity-bars">
                        {empresaAnnualActivity.items.map(item => (
                            <div
                                key={item.year}
                                className="empresa-activity-column"
                            >
                                <div className="empresa-activity-bar-wrap" aria-hidden="true">
                                    <span style={{ height: `${Math.max(4, Math.round((item.amount / empresaAnnualActivity.maxAmount) * 100))}%`, '--bar-width': `${Math.max(4, Math.round((item.amount / empresaAnnualActivity.maxAmount) * 100))}%` }}></span>
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
                <SearchField
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                    placeholder="Cerca per descripció o codi d'expedient"
                    ariaLabel="Cerca per descripció o codi d'expedient"
                />
                <FilterActions
                    open={empresaFiltersOpen}
                    onToggle={() => setEmpresaFiltersOpen(prev => !prev)}
                    activeCount={activeFiltersCount}
                    onReset={resetFilters}
                />

                <div className={"filters search-filter-panel" + (!empresaFiltersOpen ? " collapsed" : "")}>
                    <div className="filter-group filter-group-standard">
                        <label className="filter-label">Ordenar per</label>
                        <select className="filter-select filter-select-standard" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Ordenar contractes de l'empresa per">
                            <option value="date-desc">Data (més recents)</option>
                            <option value="date-asc">Data (més antics)</option>
                            <option value="amount-desc">Import (descendent)</option>
                            <option value="amount-asc">Import (ascendent)</option>
                        </select>
                    </div>
                    <div className="filter-group filter-group-standard">
                        <label className="filter-label">Procediment</label>
                        <select className="filter-select filter-select-standard" value={procedureFilter} onChange={(e) => setProcedureFilter(e.target.value)} aria-label="Procediment">
                            <option value="">Tots els procediments</option>
                            <option value="Menor">Menor</option>
                            <option value="Obert">Obert</option>
                            <option value="Negociat sense publicitat">Negociat sense publicitat</option>
                            <option value="Licitació amb negociació">Licitació amb negociació</option>
                            <option value="Adjudicacions directes no menors">Adjudicació directa</option>
                            <option value="Específic de sistema dinàmic de contractació">Sistema dinàmic</option>
                        </select>
                    </div>
                    <div className="filter-group filter-group-standard">
                        <label className="filter-label">Tipus</label>
                        <select className="filter-select filter-select-standard" value={tipusFilter} onChange={(e) => setTipusFilter(e.target.value)} aria-label="Tipus de contracte">
                            <option value="">Tots els tipus</option>
                            <option value="1. OBRES">Obres</option>
                            <option value="3. SUBMINISTRAMENTS">Subministraments</option>
                            <option value="5. SERVEIS">Serveis</option>
                            <option value="6. ADMINISTRATIU ESPECIAL">Administratiu especial</option>
                            <option value="2. GESTIÓ DE SERVEI PÚBLIC">Gestió de servei públic</option>
                            <option value="8. CONCESSIÓ DE SERVEIS">Concessió de serveis</option>
                            <option value="10. PRIVAT D'ADMINISTRACIO PUBLICA">Privat d'administració pública</option>
                        </select>
                    </div>
                </div>
                <div className={"filters-row search-filter-panel search-filter-panel-secondary" + (!empresaFiltersOpen ? " collapsed" : "")}>
                    <div className="filter-group filter-group-standard">
                        <label className="filter-label">Data inici</label>
                        <input type="date" className="filter-input" aria-label="Data inici" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
                    </div>
                    <div className="filter-group filter-group-standard">
                        <label className="filter-label">Data final</label>
                        <input type="date" className="filter-input" aria-label="Data final" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
                    </div>
                    <div className="filter-group filter-group-standard">
                        <label className="filter-label">Des de</label>
                        <input type="number" min="0" step="0.01" inputMode="decimal" className="filter-input" placeholder="Import mínim" aria-label="Import mínim" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} />
                    </div>
                    <div className="filter-group filter-group-standard">
                        <label className="filter-label">Fins a</label>
                        <input type="number" min="0" step="0.01" inputMode="decimal" className="filter-input" placeholder="Import màxim" aria-label="Import màxim" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} />
                    </div>
                </div>
            </div>
            <div className="results-count">
                <span className="results-count-total"><span className="results-count-prefix">S'han trobat </span><strong>{empresaContracts.length}</strong> contractes</span>
                {empresaContracts.length > itemsPerPage && (
                    <span className="results-count-page">
                        <span className="results-count-page-full">Pàgina</span><span className="results-count-page-short">Pàg.</span>{' '}
                        <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
                    </span>
                )}
            </div>
            {contractesPaginats.map(c => (
                <a
                    key={c.id}
                    href={buildRouteUrl(`/contractes/${c.slug}`)}
                    className="card-link-wrapper"
                    onClick={(event) => handleInternalLinkClick(event, () => onContractSelect(c))}
                >
                    <div className="contract-card">
                        <div className="contract-header">
                            <div className="contract-title">{c.descripcion}</div>
                            <div className="contract-amount">{formatCurrency(c.importe)}</div>
                        </div>
                        <div className="contract-meta">
                            <div className="contract-meta-item">
                                <span className="contract-meta-label">Data</span>
                                <span className="contract-meta-value">{formatDate(c.fecha)}</span>
                            </div>
                            <div className="contract-meta-item">
                                <span className="contract-meta-label">Codi expedient</span>
                                <span className="contract-meta-value">{c.codigo}</span>
                            </div>
                            <div className="contract-pills">
                                <span className="contract-pill">{formatTipus(c.tipo)}</span>
                                <span className="contract-pill procedure">{formatProcediment(c.procedimiento)}</span>
                            </div>
                        </div>
                    </div>
                </a>
            ))}
            {empresaContracts.length === 0 && (
                <EmptySearchState text="No s'han trobat contractes." onReset={resetFilters} />
            )}
            {empresaContracts.length > itemsPerPage && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            )}
            <div className="empresa-detail-actions-row contracte-detail-actions-row">
                <button onClick={onBack} className="btn-share empresa-detail-back contracte-detail-back" title="Tornar" aria-label="Tornar" type="button">
                    <svg className="contracte-detail-back-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg>
                    <span>Tornar</span>
                </button>
                <div className={`contracte-detail-share contracte-detail-share-standalone${shareActionsOpen ? ' is-open' : ''}`} ref={shareActionsRef}>
                    <div id="empresa-share-actions" className="contracte-detail-share-actions" aria-hidden={!shareActionsOpen}>
                        <button className="btn-share contracte-detail-share-btn" onClick={copyEmpresaLink} tabIndex={shareActionsOpen ? 0 : -1} type="button">{shareCopyStatus || "Copia l'enllaç"}</button>
                    </div>
                    <button className="btn-share contracte-detail-share-btn" onClick={() => setShareActionsOpen(open => !open)} aria-expanded={shareActionsOpen} aria-controls="empresa-share-actions" type="button"><em className="share-arrow"></em> Compartir</button>
                </div>
            </div>
        </div>
    );
}

