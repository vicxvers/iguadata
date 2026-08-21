/* ---- generateShareImage ----------------------------------------- */
async function generateShareImage(contract) {
    const W = 1080, H = 1350;
    const PAD_L = 68;
    const PAD_TOP = 135;
    const PAD_BOT = 135;
    const BG = '#0d1f3c';
    const TEXT = '#f8fafc';
    const LABEL = 'rgba(248,250,252,0.65)';

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    function ls(size) { return `${(size * -0.025).toFixed(2)}px`; }

    const maxW = W - PAD_L * 2;

    // 1 - IMPORT
    const amountSize = 144;
    const amountBaseline = PAD_TOP + Math.round(amountSize * 0.72);
    const rawAmount = new Intl.NumberFormat('ca-ES', {
        minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(contract.importe);
    ctx.font = `400 ${amountSize}px 'Instrument Serif', serif`;
    ctx.fillStyle = TEXT;
    ctx.letterSpacing = ls(amountSize);
    ctx.fillText(rawAmount + '\u20ac', PAD_L, amountBaseline);

    // 2 - TÍTOL AMB AUTO-SHRINK
    const fieldsStartY = H * 0.635;
    const titleMaxBottom = fieldsStartY - 135;
    const titleGroupTop = amountBaseline + Math.round(amountSize * 0.22) + 68;

    function getTitleStartY(size) {
        return titleGroupTop + Math.round(size * 0.72);
    }
    function measureLastY(size) {
        const lh = Math.round(size * 1.125);
        const startY = getTitleStartY(size);
        ctx.font = `500 ${size}px 'Instrument Sans', sans-serif`;
        ctx.letterSpacing = ls(size);
        const words = contract.descripcion.split(' ');
        let line = '', curY = startY;
        for (const w of words) {
            const t = line ? line + ' ' + w : w;
            if (ctx.measureText(t).width > maxW && line) { line = w; curY += lh; }
            else { line = t; }
        }
        return curY;
    }

    let fontSize = 64;
    while (fontSize >= 28 && measureLastY(fontSize) > titleMaxBottom) { fontSize -= 4; }
    const lineH = Math.round(fontSize * 1.125);
    const titleStartY = getTitleStartY(fontSize);

    ctx.font = `500 ${fontSize}px 'Instrument Sans', sans-serif`;
    ctx.fillStyle = TEXT;
    ctx.letterSpacing = ls(fontSize);
    const titleWords = contract.descripcion.split(' ');
    let tLine = '', tY = titleStartY;
    for (const w of titleWords) {
        const t = tLine ? tLine + ' ' + w : w;
        if (ctx.measureText(t).width > maxW && tLine) {
            ctx.fillText(tLine, PAD_L, tY);
            tLine = w; tY += lineH;
        } else { tLine = t; }
    }
    if (tLine) ctx.fillText(tLine, PAD_L, tY);

    // 3 - CAMPS EN 2 COLUMNES
    const fields = [
        { label: 'CONTRACTANT', value: contract.organismo },
        { label: 'TIPUS DE CONTRACTE', value: formatTipus(contract.tipo) },
        { label: 'PROCEDIMENT', value: (contract.procedimiento && contract.procedimiento !== 'nan') ? formatProcediment(contract.procedimiento) : '\u2014' },
        { label: "DATA D'ADJUDICACI\u00d3", value: formatDate(contract.fecha) },
    ];
    const colW = maxW / 2;
    const rowH = 185;

    function drawLabel(text, x, sy) {
        const lbSize = 28, lbLineH = 38, lbMaxW = colW - 40;
        ctx.font = `600 ${lbSize}px 'Zalando Sans Expanded', sans-serif`;
        ctx.fillStyle = LABEL;
        ctx.letterSpacing = ls(lbSize);
        const ws = text.split(' ');
        let l = '', ly = sy;
        for (const w of ws) {
            const t = l ? l + ' ' + w : w;
            if (ctx.measureText(t).width > lbMaxW && l) {
                ctx.fillText(l, x, ly); l = w; ly += lbLineH;
            } else { l = t; }
        }
        if (l) ctx.fillText(l, x, ly);
        return ly;
    }

    fields.forEach((f, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = PAD_L + col * colW;
        const fy = fieldsStartY + row * rowH;
        const labelEndY = drawLabel(f.label, x, fy);
        const valMaxW = colW - 40;
        let val = f.value || '\u2014';
        ctx.font = `400 32px 'Instrument Sans', sans-serif`;
        ctx.fillStyle = TEXT;
        ctx.letterSpacing = ls(32);
        while (ctx.measureText(val).width > valMaxW && val.length > 5) {
            val = val.slice(0, -4) + '\u2026';
        }
        ctx.fillText(val, x, labelEndY + 48);
    });

    // 4 - LOGO
    const logoHeight = 72;
    const logoWidth = 216; // 3:1 aspect ratio
    const img = new Image();
    img.src = assetUrl('/assets/iguadata.svg');
    await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
    });
    if (img.complete && img.naturalWidth > 0) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = logoWidth;
        tempCanvas.height = logoHeight;
        const tCtx = tempCanvas.getContext('2d');
        tCtx.drawImage(img, 0, 0, logoWidth, logoHeight);
        tCtx.globalCompositeOperation = 'source-in';
        tCtx.fillStyle = TEXT;
        tCtx.fillRect(0, 0, logoWidth, logoHeight);
        ctx.drawImage(tempCanvas, PAD_L, H - PAD_BOT - logoHeight + 20);
    }

    // Descarregar
    const link = document.createElement('a');
    link.download = `iguadata-${contract.slug || buildContractSlug(contract)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

/* ---- ContractDetailView ----------------------------------------- */
function ContractDetailView({ contract: c, empreses, onBack, onEmpresaClick }) {
    const [shareActionsOpen, setShareActionsOpen] = useState(false);
    const [shareCopyStatus, setShareCopyStatus] = useState('');
    const [shareDownloadStatus, setShareDownloadStatus] = useState('');
    const shareActionsRef = useRef(null);
    const shareStatusTimerRef = useRef(null);
    const shareDownloadTimerRef = useRef(null);
    const linkedEmpresa = empreses.find(empresa => empresa.nom === c.adjudicatario);
    const empresaHref = buildRouteUrl(linkedEmpresa?.slug ? `/empreses/${linkedEmpresa.slug}` : '/empreses');
    const isPreserved = c.evidencia_congelada === true || c.estat_font === 'preservat_desaparegut_socrata' || c.preservat_iguadata;
    const hasCpv = Boolean(String(c.cpv || '').trim());

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

    useEffect(() => () => {
        window.clearTimeout(shareStatusTimerRef.current);
        window.clearTimeout(shareDownloadTimerRef.current);
    }, []);

    const copyContractLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setShareCopyStatus('Enllaç copiat');
        } catch (_) {
            setShareCopyStatus("No s'ha pogut copiar");
        }
        window.clearTimeout(shareStatusTimerRef.current);
        shareStatusTimerRef.current = window.setTimeout(() => setShareCopyStatus(''), 1800);
    };

    const downloadContractImage = () => {
        generateShareImage(c);
        setShareDownloadStatus('Imatge descarregada');
        window.clearTimeout(shareDownloadTimerRef.current);
        shareDownloadTimerRef.current = window.setTimeout(() => setShareDownloadStatus(''), 1800);
    };

    return (
        <div className="container contracte-detail-page">
            <h1 className="page-title">Detall de contracte</h1>
            <div className="contracte-detail-hero">
                <div className="contracte-detail-amount">{formatCurrency(c.importe)}</div>
                <div className="contract-header contracte-detail-title-row">
                    <h2 className="contracte-detail-title">{c.descripcion}</h2>
                </div>
                <div className="contracte-detail-hero-company">
                    <div className="contract-header contracte-detail-company-row">
                        <h2 className="contracte-detail-company-title">
                            <a
                                className="contracte-detail-company-link"
                                href={empresaHref}
                                onClick={(event) => handleInternalLinkClick(event, () => onEmpresaClick(c.adjudicatario))}
                            >
                                {c.adjudicatario}
                            </a>
                        </h2>
                    </div>
                </div>
            </div>
            <div className="contracte-detail-info-card">
                {isPreserved && (
                    <div className="contracte-preserved-notice">
                        Aquest contracte és recuperat i ja no consta al registre públic. La fitxa i evidència es preserven per mantenir la traçabilitat de les dades.
                    </div>
                )}
                <div className={`contract-meta contracte-detail-meta contracte-detail-info-meta${hasCpv ? '' : ' contracte-detail-info-meta-without-cpv'}`}>
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">Data</span>
                        <span className="contract-meta-value">{formatDate(c.fecha)}</span>
                    </div>
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">Codi expedient</span>
                        <span className="contract-meta-value">{c.codigo}</span>
                    </div>
                    {hasCpv && (
                        <div className="contract-meta-item">
                            <span className="contract-meta-label">CPV</span>
                            <span className="contract-meta-value">{c.cpv}</span>
                        </div>
                    )}
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">Contractant</span>
                        <span className="contract-meta-value">{c.organismo}</span>
                    </div>
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">Tipus</span>
                        <span className="contract-meta-value">{formatTipus(c.tipo)}</span>
                    </div>
                    <div className="contract-meta-item">
                        <span className="contract-meta-label">Procediment</span>
                        <span className="contract-meta-value">{formatProcediment(c.procedimiento)}</span>
                    </div>
                </div>
            </div>
            <div className="contracte-detail-actions-row">
                <button onClick={onBack} className="btn-share contracte-detail-back" title="Tornar" aria-label="Tornar" type="button">
                    <svg className="contracte-detail-back-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5" /><polyline points="12 19 5 12 12 5" /></svg>
                    <span>Tornar</span>
                </button>
                <div className={`contracte-detail-share contracte-detail-share-standalone${shareActionsOpen ? ' is-open' : ''}`} ref={shareActionsRef}>
                    <div
                        id="contract-share-actions"
                        className="contracte-detail-share-actions"
                        aria-hidden={!shareActionsOpen}
                    >
                        <button
                            id="analisi-tab-fraccionament"
                            className="btn-share contracte-detail-share-btn"
                            onClick={copyContractLink}
                            tabIndex={shareActionsOpen ? 0 : -1}
                            type="button"
                        >
                            {shareCopyStatus || "Copia l'enllaç"}
                        </button>
                        <button
                            id="analisi-tab-monopoli"
                            className="btn-share contracte-detail-share-btn"
                            onClick={downloadContractImage}
                            tabIndex={shareActionsOpen ? 0 : -1}
                            type="button"
                        >
                            {shareDownloadStatus || "Descarrega l'imatge"}
                        </button>
                    </div>
                    <button
                        className="btn-share contracte-detail-share-btn"
                        onClick={() => setShareActionsOpen(open => !open)}
                        aria-expanded={shareActionsOpen}
                        aria-controls="contract-share-actions"
                        type="button"
                    >
                        <em className="share-arrow"></em> Compartir
                    </button>
                </div>
            </div>
        </div>
    );
}

