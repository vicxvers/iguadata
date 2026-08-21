/* ---- EmpresesView ----------------------------------------------- */
function CasosView({ casos, onCasoSelect }) {
    const casosOrdenats = casos
        .map((caso, index) => ({ caso, index }))
        .sort((a, b) => {
            const dateA = Date.parse(a.caso.publishedAt || '');
            const dateB = Date.parse(b.caso.publishedAt || '');
            if (Number.isFinite(dateA) && Number.isFinite(dateB) && dateA !== dateB) return dateB - dateA;
            if (Number.isFinite(dateA) !== Number.isFinite(dateB)) return Number.isFinite(dateA) ? -1 : 1;
            return a.index - b.index;
        })
        .map(item => item.caso);
    const featuredCaso = casosOrdenats[0];
    const gridCasos = casosOrdenats.slice(1);

    if (!featuredCaso) {
        return (
            <div className="container casos-page">
                <h1 className="page-title">Casos d'investigació</h1>
                <div className="empty-state" role="status">
                    <h2 className="empty-state-title">Encara no hi ha investigacions publicades</h2>
                    <p className="empty-state-text">Els nous casos apareixeran aquí quan estiguin disponibles.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container casos-page">
            <h1 className="page-title">Casos d'investigació</h1>
            <CasoPrincipalInvestigacio caso={featuredCaso} onSelect={onCasoSelect} />
            <div className="casos-editorial-list" aria-label="Investigacions publicades">
                {gridCasos.map((caso, idx) => (
                    <CasoEditorialCard key={caso.slug} caso={caso} idx={idx + 1} onSelect={onCasoSelect} />
                ))}
            </div>
        </div>
    );
}

function CasoPrincipalInvestigacio({ caso, onSelect }) {
    const content = (
        <>
            <div className="caso-principal-image-frame">
                <img
                    src={assetUrl(caso.image)}
                    alt=""
                    className="caso-editorial-image"
                    loading="eager"
                />
            </div>
            <div className="caso-principal-copy">
                <h2 className="caso-principal-title">{caso.title}</h2>
                <p className="caso-principal-subtitle">{caso.subtitle}</p>
                {Number.isFinite(Number(caso.importe)) && (
                    <div className="caso-principal-amount">{formatCurrency(Number(caso.importe))}</div>
                )}
            </div>
        </>
    );

    return (
        <a
            href={buildRouteUrl('/investigacio/' + caso.slug)}
            className="caso-principal caso-principal-linkable"
            onClick={(event) => handleInternalLinkClick(event, () => onSelect(caso))}
        >
            {content}
        </a>
    );
}

function CasoEditorialCard({ caso, idx, className = '', showImage = false, onSelect }) {
    return (
        <article className={'contract-card caso-editorial-card caso-editorial-card-linkable' + (className ? ' ' + className : '')}>
            <a
                href={buildRouteUrl('/investigacio/' + caso.slug)}
                className="caso-editorial-link"
                onClick={(event) => handleInternalLinkClick(event, () => onSelect(caso))}
            >
                <CasoEditorialContent caso={caso} idx={idx} showImage={showImage} />
            </a>
        </article>
    );
}
function CasoEditorialContent({ caso, idx, showImage }) {
    if (!showImage) {
        return (
            <div className="contract-header caso-list-header">
                <div className="caso-list-copy">
                    <h2 className="contract-title caso-editorial-title">{caso.title}</h2>
                    <div className="caso-editorial-subtitle">{caso.subtitle}</div>
                </div>
                {Number.isFinite(Number(caso.importe)) && (
                    <div className="contract-amount caso-list-amount">{formatCurrency(Number(caso.importe))}</div>
                )}
            </div>
        );
    }

    return (
        <>
            {showImage && (
                <div className="caso-editorial-image-frame">
                    <img
                        src={assetUrl(caso.image)}
                        alt=""
                        className="caso-editorial-image"
                        loading={idx === 0 ? 'eager' : 'lazy'}
                    />
                </div>
            )}
            <div className="caso-editorial-copy">
                <h2 className="caso-editorial-title">{caso.title}</h2>
                <p className="caso-editorial-subtitle">{caso.subtitle}</p>
            </div>
        </>
    );
}

function InvestigacioContractCard({ contract, onSelect, hideAdjudicatario = false }) {
    const frozen = contract.evidencia_congelada === true;
    const card = (
            <div className="contract-card">
                <div className="contract-header">
                    <div className="contract-title">{contract.descripcion}</div>
                    <div className="contract-amount">{formatCurrency(contract.importe)}</div>
                </div>
                <div className="contract-meta">
                    {!hideAdjudicatario && (
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">Empresa adjudicatària</span>
                        <span className="contract-meta-value">{contract.adjudicatario}</span>
                    </div>
                    )}
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">Data</span>
                        <span className="contract-meta-value">{formatDate(contract.fecha)}</span>
                    </div>
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">Codi expedient</span>
                        <span className="contract-meta-value">{contract.codigo}</span>
                    </div>
                    <div className="contract-pills">
                        <span className="contract-pill">{formatTipus(contract.tipo)}</span>
                        <span className="contract-pill procedure">{formatProcediment(contract.procedimiento)}</span>
                    </div>
                </div>
            </div>
    );
    const detailPath = frozen
        ? `/contractes/evidencia/${contract.slug}`
        : `/contractes/${contract.slug}`;
    return (
        <a href={buildRouteUrl(detailPath)} className="card-link-wrapper" onClick={(event) => handleInternalLinkClick(event, () => onSelect(contract))}>
            {card}
        </a>
    );
}

function InvestigacioPaginatedContracts({ block, contracts, onContractSelect }) {
    const itemsPerPage = block.itemsPerPage || 25;
    const [currentPage, setCurrentPage] = useState(1);
    const codes = block.codes || [];
    const frozenByCode = useMemo(() => {
        const map = new Map();
        (block.contract_snapshots || []).forEach(contract => {
            const code = String(contract.codigo || '').trim();
            if (code && !map.has(code)) map.set(code, contract);
        });
        return map;
    }, [block.contract_snapshots]);
    const contractsByCode = useMemo(() => {
        const map = new Map();
        contracts.forEach(contract => {
            const code = String(contract.codigo || '').trim();
            if (code) map.set(code, [...(map.get(code) || []), contract]);
        });
        return map;
    }, [contracts]);
    const blockContracts = useMemo(() => {
        const resolved = codes
            .map(code => {
                const normalized = String(code || '').trim();
                const frozen = frozenByCode.get(normalized);
                const candidates = contractsByCode.get(normalized) || [];
                if (!frozen) return candidates[0];
                return candidates.find(contract => sameContractEvidence(contract, frozen)) || frozen;
            })
            .filter(Boolean);
        if (block.sort === 'date-desc') {
            resolved.sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')) || String(b.codigo || '').localeCompare(String(a.codigo || '')));
        }
        return resolved;
    }, [codes, contractsByCode, frozenByCode, block.sort]);
    const totalPages = Math.ceil(blockContracts.length / itemsPerPage);
    const pageContracts = blockContracts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const goToPage = (page) => {
        const nextPage = Math.max(1, Math.min(page, totalPages || 1));
        setCurrentPage(nextPage);
    };

    if (!blockContracts.length) return null;

    return (
        <section className="investigacio-embed investigacio-card-stack" aria-label={block.ariaLabel || 'Contractes relacionats'}>
            {pageContracts.map(contract => <InvestigacioContractCard key={contract.slug} contract={contract} onSelect={onContractSelect} hideAdjudicatario={Boolean(block.hideAdjudicatario)} />)}
            {blockContracts.length > itemsPerPage && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={goToPage}
                />
            )}
        </section>
    );
}

function InvestigacioCaseView({ caso, contracts, onBack, onContractSelect }) {
    const [shareActionsOpen, setShareActionsOpen] = useState(false);
    const [shareCopyStatus, setShareCopyStatus] = useState('');
    const shareActionsRef = useRef(null);
    const shareStatusTimerRef = useRef(null);

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

    if (!caso) return null;

    const copyInvestigacioLink = async () => {
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
        <article className="container prose-page investigacio-detail-page">
            <header className="investigacio-detail-header">
                <h1 className="page-title">{caso.title}</h1>
                {Number.isFinite(Number(caso.importe)) && <div className="investigacio-detail-amount">{formatCurrency(Number(caso.importe))}</div>}
                <p className="investigacio-detail-subtitle">{caso.subtitle}</p>
            </header>

            {caso.image && (
                <div className="investigacio-featured-image-frame">
                    <img
                        src={assetUrl(caso.image)}
                        alt={caso.title + ': ' + caso.subtitle}
                        className="investigacio-featured-image"
                    />
                </div>
            )}

            <div className="prose-wrapper investigacio-story">
                {(caso.content || []).map((block, index) => {
                    const key = block.id || block.type + '-' + index;
                    if (block.type === 'heading') {
                        return <h2 key={key} className="prose-heading">{block.text}</h2>;
                    }
                    if (block.type === 'paragraph') {
                        return <p key={key} className="prose-intro investigacio-copy">{block.text}</p>;
                    }
                    if (block.type === 'contracts') {
                        const frozenBySlug = new Map((block.contract_snapshots || []).map(contract => [contract.slug, contract]));
                        const blockContracts = (block.slugs || [])
                            .map(slug => {
                                const current = contracts.find(contract => contractMatchesSlug(contract, slug));
                                const frozen = frozenBySlug.get(slug);
                                if (!frozen) return current;
                                return current && sameContractEvidence(current, frozen) ? current : frozen;
                            })
                            .filter(Boolean)
                            .sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')));
                        return (
                            <section key={key} className="investigacio-embed investigacio-card-stack" aria-label={block.ariaLabel || 'Contractes relacionats'}>
                                {blockContracts.map(contract => <InvestigacioContractCard key={contract.slug} contract={contract} onSelect={onContractSelect} />)}
                            </section>
                        );
                    }
                    if (block.type === 'contracts_paginated') {
                        return <InvestigacioPaginatedContracts key={key} block={block} contracts={contracts} onContractSelect={onContractSelect} />;
                    }
                    return null;
                })}
            </div>

            <div className="contracte-detail-actions-row investigacio-detail-actions-row">
                <button onClick={onBack} className="btn-share contracte-detail-back" title="Tornar" aria-label="Tornar" type="button">
                    <svg className="contracte-detail-back-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg>
                    <span>Tornar</span>
                </button>
                <div className={`contracte-detail-share contracte-detail-share-standalone${shareActionsOpen ? ' is-open' : ''}`} ref={shareActionsRef}>
                    <div id="investigacio-share-actions" className="contracte-detail-share-actions" aria-hidden={!shareActionsOpen}>
                        <button className="btn-share contracte-detail-share-btn" onClick={copyInvestigacioLink} tabIndex={shareActionsOpen ? 0 : -1} type="button">{shareCopyStatus || "Copia l'enllaç"}</button>
                    </div>
                    <button className="btn-share contracte-detail-share-btn" onClick={() => setShareActionsOpen(open => !open)} aria-expanded={shareActionsOpen} aria-controls="investigacio-share-actions" type="button"><em className="share-arrow"></em> Compartir</button>
                </div>
            </div>
        </article>
    );
}
