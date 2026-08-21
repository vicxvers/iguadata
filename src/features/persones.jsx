function PersonesView({ persones, onEmpresaSelect, onNavigateLegal, searchTerm, setSearchTerm, sortBy, setSortBy, currentPage, setCurrentPage, expandedIdx, setExpandedIdx }) {
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
    const [personesFiltersOpen, setPersonesFiltersOpen] = useState(false);
    const itemsPerPage = 25;

    const togglePersona = (personaId) => {
        setExpandedIdx(prev => prev === personaId ? null : personaId);
    };

    const resetFilters = () => {
        setSearchTerm('');
        setDebouncedSearch('');
        setSortBy('companies-desc');
        setCurrentPage(1);
        setExpandedIdx(null);
    };

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
        setExpandedIdx(null);
    }, [debouncedSearch, sortBy]);

    const personesFiltrades = useMemo(() => {
        let result = [...persones];

        if (debouncedSearch) {
            result = result.filter(p => matchesSearchQuery(
                [p.nom, ...(p.relacions || []).map(e => e.empresa)],
                debouncedSearch
            ));
        }

        switch (sortBy) {
            case 'amount-desc':
                result.sort((a, b) => b.total_adjudicat - a.total_adjudicat);
                break;
            case 'amount-asc':
                result.sort((a, b) => a.total_adjudicat - b.total_adjudicat);
                break;
            case 'companies-desc':
                result.sort((a, b) => b.relacions.length - a.relacions.length);
                break;
            case 'companies-asc':
                result.sort((a, b) => a.relacions.length - b.relacions.length);
                break;
            case 'name-asc':
                result.sort((a, b) => a.nom.localeCompare(b.nom, 'ca'));
                break;
            default:
                result.sort((a, b) => b.total_adjudicat - a.total_adjudicat);
        }

        return result;
    }, [persones, debouncedSearch, sortBy]);

    const totalPages = Math.ceil(personesFiltrades.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const personesPaginades = personesFiltrades.slice(startIndex, endIndex);
    const activeFiltersCount = sortBy !== 'companies-desc' ? 1 : 0;

    return (
        <div className="container persones-page">
            <h1 className="page-title">Cercador de persones</h1>
            <div className="search-section">
                <SearchField
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                    placeholder="Cerca per persona o empresa vinculada"
                    ariaLabel="Cerca per persona o empresa vinculada"
                />

                <FilterActions
                    open={personesFiltersOpen}
                    onToggle={() => setPersonesFiltersOpen(prev => !prev)}
                    activeCount={activeFiltersCount}
                    onReset={resetFilters}
                    controlsId="persones-filter-panel"
                />

                <div id="persones-filter-panel" className={"filters search-filter-panel search-filter-panel-single" + (!personesFiltersOpen ? " collapsed" : "")}>
                    <div className="filter-group filter-group-standard">
                        <label className="filter-label">Ordenar per</label>
                        <select className="filter-select filter-select-standard" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Ordenar persones per">
                            <option value="companies-desc">Nombre d'empreses (descendent)</option>
                            <option value="companies-asc">Nombre d'empreses (ascendent)</option>
                            <option value="amount-desc">Import (descendent)</option>
                            <option value="amount-asc">Import (ascendent)</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="results-count" role="status" aria-live="polite">
                <span className="results-count-total"><span className="results-count-prefix">S'han trobat </span><strong>{personesFiltrades.length}</strong> persones</span>
                {personesFiltrades.length > itemsPerPage && (
                    <span className="results-count-page"><span className="results-count-page-full">Pàgina</span><span className="results-count-page-short">Pàg.</span> <strong>{currentPage}</strong> de <strong>{totalPages}</strong></span>
                )}
            </div>

            <div className="persones-compact-list">
                {personesPaginades.map((p) => {
                    const personaId = `persona-${stableHash([p.nom])}`;
                    const panelId = `${personaId}-relacions`;
                    const isExpanded = expandedIdx === personaId;
                    const principalEmpresa = (p.relacions || []).reduce((principal, relacio) =>
                        !principal || Number(relacio.import_empresa) > Number(principal.import_empresa)
                            ? relacio
                            : principal
                        , null);
                    return (
                        <div key={p.nom} className="contract-card persona-card">
                            <button
                                id={`${personaId}-trigger`}
                                type="button"
                                className={`persona-row-header${isExpanded ? ' is-expanded' : ''}`}
                                onClick={() => togglePersona(personaId)}
                                aria-expanded={isExpanded}
                                aria-controls={panelId}
                            >
                                <div className="contract-header persona-row-main">
                                    <div className="contract-title persona-title">{p.nom}</div>
                                    <div className="contract-amount persona-amount">
                                        {formatCurrency(p.total_adjudicat)}
                                    </div>
                                </div>
                                <div className="contract-meta persona-row-meta">
                                    {principalEmpresa && (
                                        <div className="contract-meta-item">
                                            <span className="contract-meta-label">Empresa principal</span>
                                            <span className="contract-meta-value persona-primary-company">{principalEmpresa.empresa}</span>
                                        </div>
                                    )}
                                    <div className="contract-pills">
                                        <span className="contract-pill">
                                            {p.relacions.length} {p.relacions.length === 1 ? 'empresa' : 'empreses'}
                                        </span>
                                    </div>
                                </div>
                            </button>

                            <div
                                id={panelId}
                                className={`persona-row-body-wrapper${isExpanded ? ' is-expanded' : ''}`}
                                role="region"
                                aria-labelledby={`${personaId}-trigger`}
                                aria-hidden={!isExpanded}
                            >
                                <div>
                                    <div className="persona-row-body">
                                        <div className="persona-relacions-list">
                                            {p.relacions.map((emp) => (
                                                <a
                                                    key={emp.empresa}
                                                    href={buildRouteUrl(`/empreses/${buildEmpresaSlug(emp.empresa)}`)}
                                                    className="persona-relacio-item"
                                                    tabIndex={isExpanded ? 0 : -1}
                                                    onClick={(event) => handleInternalLinkClick(event, () => onEmpresaSelect(emp.empresa))}
                                                >
                                                    <div className="persona-relacio-empresa">{emp.empresa}</div>
                                                    <div className="contract-amount persona-relacio-amount">
                                                        {formatCurrency(emp.import_empresa)}
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {personesFiltrades.length === 0 && (
                <EmptySearchState text="No s'han trobat persones." onReset={resetFilters} />
            )}

            {personesFiltrades.length > itemsPerPage && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => {
                        setCurrentPage(page);
                        setExpandedIdx(null);
                    }}
                />
            )}

            <div className="metodologia-wrapper">
                <div className="metodologia">
                    <h3 className="metodologia-legal-title">Metodologia</h3>
                    <p className="metodologia-intro">
                        Les persones que apareixen en aquest cercador es mostren en la seva condició de representants mercantils d'empreses adjudicatàries de {AUTHORITY_NAME}, segons les dades del Butlletí Oficial del Registre Mercantil (BORME) i la plataforma de contractació municipal, registres oficials de caràcter públic i universal.
                    </p>
                    <p className="metodologia-intro">
                        L'import que figura al costat de cada persona correspon al volum total adjudicat a les empreses on exerceix o ha exercit un càrrec mercantil. Aparèixer en aquest llistat no implica cap irregularitat, sinó que reflecteix únicament la vinculació professional pública entre la persona i les empreses que han contractat amb l'Ajuntament. Les dades poden contenir errors derivats de fonts públiques o processos automatitzats, i qualsevol correcció factual serà revisada.
                    </p>
                    <p className="metodologia-intro">
                        El tractament de les dades es realitza a l'empara de l'article 6.1.e) del Reglament UE 2016/679 (RGPD) d'interès públic i de la Llei 19/2013, de 9 de desembre, de transparència, accés a la informació pública i bon govern, que estableix l'obligació de publicitat activa en matèria de contractació pública. Les dades es limiten a la informació estrictament necessària per al propòsit de transparència i es tracten d'acord amb el principi de minimització de dades (art. 5.1.c RGPD). Tota la informació publicada prové de fonts oficials de caràcter públic i no inclou dades de la vida privada de les persones.
                    </p>
                    <p className="metodologia-intro metodologia-intro-last">
                        Les persones interessades poden exercir els drets d'accés, rectificació, limitació o oposició al tractament posant-se en contacte a través de la secció <a href="/avis-legal" onClick={(e) => { e.preventDefault(); onNavigateLegal(); }} className="prose-link">Avís legal</a>. El dret de supressió (dret a l'oblit) queda limitat per l'art. 17.3.b) del RGPD quan les dades figuren en registres oficials públics o en documentació administrativa de contractació pública, sense perjudici del dret a sol·licitar la revisió de possibles errors factuals.
                    </p>
                </div>
            </div>
        </div>
    );
}

