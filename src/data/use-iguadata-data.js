const DATA_TABS = [
    'buscador',
    'empreses',
    'persones',
    'contracte',
    'empresa',
    'analisi',
    'cas-fraccionament',
    'cas-concentracio',
    'cas-electoralisme',
    'cas-dependencia',
    'cas-investigacio',
];
const ANALYSIS_TABS = [
    'analisi',
    'cas-fraccionament',
    'cas-concentracio',
    'cas-electoralisme',
    'cas-dependencia',
];
const INVESTIGATION_TABS = ['casos', 'cas-investigacio'];
const SUBVENTION_TABS = ['subvencions', 'entitat'];

function useIguadataData(activeTab) {
    const [contracts, setContracts] = useState([]);
    const [empreses, setEmpreses] = useState([]);
    const [persones, setPersones] = useState([]);
    const [administradors, setAdministradors] = useState({});
    const [fraudes, setFraudes] = useState([]);
    const [concentracio, setConcentracio] = useState([]);
    const [electoral, setElectoral] = useState([]);
    const [dependencia, setDependencia] = useState([]);
    const [stats, setStats] = useState(null);
    const [summary, setSummary] = useState(null);
    const [casosInvestigacio, setCasosInvestigacio] = useState(CASOS_INVESTIGACIO_FALLBACK);
    const [subvencions, setSubvencions] = useState([]);

    const [loading, setLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [summaryResolved, setSummaryResolved] = useState(false);
    const [coreDataLoaded, setCoreDataLoaded] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);
    const [personesLoaded, setPersonesLoaded] = useState(false);
    const [administradorsLoaded, setAdministradorsLoaded] = useState(false);
    const [analisiLoaded, setAnalisiLoaded] = useState(false);
    const [investigacioLoaded, setInvestigacioLoaded] = useState(false);
    const [subvencionsLoaded, setSubvencionsLoaded] = useState(false);

    const [coreDataError, setCoreDataError] = useState(false);
    const [personesError, setPersonesError] = useState(false);
    const [administradorsError, setAdministradorsError] = useState(false);
    const [analisiError, setAnalisiError] = useState(false);
    const [investigacioError, setInvestigacioError] = useState(false);
    const [subvencionsError, setSubvencionsError] = useState(false);

    const [coreRetry, setCoreRetry] = useState(0);
    const [personesRetry, setPersonesRetry] = useState(0);
    const [administradorsRetry, setAdministradorsRetry] = useState(0);
    const [analisiRetry, setAnalisiRetry] = useState(0);
    const [investigacioRetry, setInvestigacioRetry] = useState(0);
    const [subvencionsRetry, setSubvencionsRetry] = useState(0);

    useEffect(() => {
        if (!SUBVENTION_TABS.includes(activeTab) || subvencionsLoaded) return;
        let cancelled = false;
        setSubvencionsError(false);
        fetchJsonDataset('/json/subvencions.json', 'Subvencions')
            .then(data => {
                if (cancelled) return;
                if (!Array.isArray(data)) throw new Error('Subvencions JSON no vàlid');
                setSubvencions(data);
                setSubvencionsLoaded(true);
            })
            .catch(error => {
                if (cancelled) return;
                console.error('Error loading subvencions:', error);
                setSubvencionsError(true);
            });
        return () => { cancelled = true; };
    }, [activeTab, subvencionsLoaded, subvencionsRetry]);

    useEffect(() => {
        if (!INVESTIGATION_TABS.includes(activeTab) || investigacioLoaded) return;
        let cancelled = false;
        setInvestigacioError(false);
        fetchJsonDataset('/json/investigacio.json', 'Investigacio')
            .then(data => {
                if (cancelled) return;
                if (!Array.isArray(data) || !data.length) throw new Error('Investigacio JSON buit');
                setCasosInvestigacio(data);
                setInvestigacioLoaded(true);
            })
            .catch(error => {
                if (cancelled) return;
                console.warn('Error loading investigacio:', error);
                setInvestigacioError(true);
        });
        return () => { cancelled = true; };
    }, [activeTab, investigacioLoaded, investigacioRetry]);

    useEffect(() => {
        if (!loading) return;
        const startTime = Date.now();
        const timer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = 95 * (1 - Math.exp(-elapsed / 800));
            setLoadingProgress(Math.floor(progress));
        }, 50);
        return () => clearInterval(timer);
    }, [loading]);

    useEffect(() => {
        let cancelled = false;
        fetch(assetUrl('/json/resum.json'), { cache: 'no-cache' })
            .then(response => response.ok ? response.json() : null)
            .then(data => {
                if (cancelled || !data) return;
                setDataVersion(data.version);
                setSummary(data);
                if (data.stats) {
                    setStats({
                        total_contratos: data.stats.total_contratos || 0,
                        importe_total: data.stats.importe_total || 0,
                        num_empresas: data.stats.num_empresas || 0,
                    });
                }
            })
            .catch(error => {
                console.warn('No s\'ha pogut carregar el resum inicial:', error);
            })
            .finally(() => {
                if (cancelled) return;
                setSummaryResolved(true);
                setLoadingProgress(100);
                setTimeout(() => {
                    if (!cancelled) setLoading(false);
                }, 180);
            });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        const requiresCoreData = DATA_TABS.includes(activeTab);
        if (!summaryResolved || !requiresCoreData || coreDataLoaded) return;

        let cancelled = false;
        setCoreDataError(false);
        setDataLoading(true);
        fetchCoreData()
            .then(data => {
                if (cancelled) return;
                setContracts(data.contracts);
                setEmpreses(data.empreses);
                setStats(data.stats);
                setCoreDataLoaded(true);
            })
            .catch(error => {
                if (cancelled) return;
                console.error('Error loading core data:', error);
                setCoreDataError(true);
            })
            .finally(() => {
                if (!cancelled) setDataLoading(false);
            });
        return () => { cancelled = true; };
    }, [activeTab, summaryResolved, coreDataLoaded, coreRetry]);

    useEffect(() => {
        if (!summaryResolved || activeTab !== 'persones' || personesLoaded) return;
        let cancelled = false;
        setPersonesError(false);
        fetchJsonDataset('/json/persones.json', 'Persones')
            .then(data => {
                if (!cancelled) setPersones(data || []);
            })
            .catch(error => {
                console.error('Error loading persones:', error);
                if (!cancelled) setPersonesError(true);
            })
            .finally(() => {
                if (!cancelled) setPersonesLoaded(true);
            });
        return () => { cancelled = true; };
    }, [activeTab, summaryResolved, personesLoaded, personesRetry]);

    useEffect(() => {
        if (!summaryResolved || activeTab !== 'empresa' || administradorsLoaded) return;
        let cancelled = false;
        setAdministradorsError(false);
        fetchJsonDataset('/json/carrecs.json', 'Carrecs')
            .then(data => {
                if (!cancelled) setAdministradors(data || {});
            })
            .catch(error => {
                console.error('Error loading carrecs:', error);
                if (!cancelled) setAdministradorsError(true);
            })
            .finally(() => {
                if (!cancelled) setAdministradorsLoaded(true);
            });
        return () => { cancelled = true; };
    }, [activeTab, summaryResolved, administradorsLoaded, administradorsRetry]);

    useEffect(() => {
        if (!summaryResolved || !ANALYSIS_TABS.includes(activeTab) || analisiLoaded) return;
        let cancelled = false;
        setAnalisiError(false);
        Promise.all([
            fetchJsonDataset('/json/fraccionament.json', 'Fraccionament'),
            fetchJsonDataset('/json/concentracio.json', 'Concentracio'),
            fetchJsonDataset('/json/electoralisme.json', 'Electoralisme'),
            fetchJsonDataset('/json/dependencia.json', 'Dependència'),
        ])
            .then(([fraccionamentData, concentracioData, electoralismeData, dependenciaData]) => {
                if (cancelled) return;
                setFraudes((fraccionamentData && fraccionamentData.alertes) || []);
                setConcentracio((concentracioData && concentracioData.alertes) || []);
                setElectoral((electoralismeData && electoralismeData.alertes) || []);
                setDependencia((dependenciaData && dependenciaData.alertes) || []);
            })
            .catch(error => {
                console.error('Error loading analysis data:', error);
                if (!cancelled) setAnalisiError(true);
            })
            .finally(() => {
                if (!cancelled) setAnalisiLoaded(true);
            });
        return () => { cancelled = true; };
    }, [activeTab, summaryResolved, analisiLoaded, analisiRetry]);

    const activeDataError =
        (DATA_TABS.includes(activeTab) && coreDataError) ||
        (activeTab === 'persones' && personesError) ||
        (activeTab === 'empresa' && administradorsError) ||
        (activeTab === 'cas-investigacio' && investigacioError) ||
        (SUBVENTION_TABS.includes(activeTab) && subvencionsError) ||
        (ANALYSIS_TABS.includes(activeTab) && analisiError);
    const supplementalDataLoading =
        (activeTab === 'persones' && !personesLoaded) ||
        (activeTab === 'empresa' && !administradorsLoaded) ||
        (activeTab === 'cas-investigacio' && !investigacioLoaded) ||
        (SUBVENTION_TABS.includes(activeTab) && !subvencionsLoaded) ||
        (ANALYSIS_TABS.includes(activeTab) && !analisiLoaded);
    const isDataTabLoading =
        (DATA_TABS.includes(activeTab) && (!coreDataLoaded || dataLoading || supplementalDataLoading)) ||
        (SUBVENTION_TABS.includes(activeTab) && supplementalDataLoading);

    const retryActiveData = () => {
        if (coreDataError) {
            setCoreRetry(value => value + 1);
            return;
        }
        if (activeTab === 'persones') {
            setPersonesLoaded(false);
            setPersonesError(false);
            setPersonesRetry(value => value + 1);
            return;
        }
        if (activeTab === 'empresa') {
            setAdministradorsLoaded(false);
            setAdministradorsError(false);
            setAdministradorsRetry(value => value + 1);
            return;
        }
        if (activeTab === 'cas-investigacio') {
            setInvestigacioError(false);
            setInvestigacioRetry(value => value + 1);
            return;
        }
        if (SUBVENTION_TABS.includes(activeTab)) {
            setSubvencionsLoaded(false);
            setSubvencionsError(false);
            setSubvencionsRetry(value => value + 1);
            return;
        }
        if (ANALYSIS_TABS.includes(activeTab)) {
            setAnalisiLoaded(false);
            setAnalisiError(false);
            setAnalisiRetry(value => value + 1);
        }
    };

    return {
        contracts,
        empreses,
        persones,
        administradors,
        fraudes,
        concentracio,
        electoral,
        dependencia,
        stats,
        summary,
        casosInvestigacio,
        subvencions,
        loading,
        loadingProgress,
        investigacioLoaded,
        investigacioError,
        activeDataError,
        isDataTabLoading,
        canRenderDataTab: !isDataTabLoading && !activeDataError,
        retryActiveData,
    };
}
