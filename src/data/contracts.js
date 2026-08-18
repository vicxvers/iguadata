async function fetchContractsSnapshot() {
    const resp = await fetch(jsonAssetUrl('/json/contractes.json'));
    if (!resp.ok) throw new Error(`Contractes HTTP ${resp.status}`);
    const data = await resp.json();
    if (!Array.isArray(data)) return [];
    return data
        .filter(contract => !contract.preservat_iguadata && contract.exclos_analisis !== true)
        .map(contract => ({
            ...contract,
            slug: contract.slug || buildContractSlug(contract),
        }));
}

async function fetchJsonDataset(path, label) {
    const response = await fetch(jsonAssetUrl(path));
    if (!response.ok) throw new Error(`${label} HTTP ${response.status}`);
    return response.json();
}

async function fetchEmpresaAliases() {
    try {
        const resp = await fetch(jsonAssetUrl('/json/empresa_aliases.json'));
        if (!resp.ok) return { aliases: {} };
        const data = await resp.json();
        return data && data.aliases ? data : { aliases: {} };
    } catch (error) {
        return { aliases: {} };
    }
}

function buildEmpreses(contracts, existingEmpreses) {
    const existingByName = {};
    for (const empresa of existingEmpreses) {
        existingByName[empresa.nom.trim().toUpperCase()] = empresa;
    }

    const groups = {};
    for (const contract of contracts) {
        const nom = contract.adjudicatario;
        if (!nom) continue;
        if (!groups[nom]) groups[nom] = { ids: [], importe: 0, cpvs: [] };
        groups[nom].ids.push(contract.id);
        groups[nom].importe += contract.importe;
        if (contract.cpv) groups[nom].cpvs.push(contract.cpv);
    }

    const result = [];
    for (const [nom, data] of Object.entries(groups)) {
        const existing = existingByName[nom];
        let sector;
        let categoria;
        if (existing && existing.sector && existing.categoria) {
            sector = existing.sector;
            categoria = existing.categoria;
        } else {
            const cpvCount = {};
            for (const cpv of data.cpvs) {
                const division = String(cpv).replace(/\D/g, '').substring(0, 2);
                cpvCount[division] = (cpvCount[division] || 0) + 1;
            }
            const topCpv = Object.entries(cpvCount).sort((a, b) => b[1] - a[1])[0];
            categoria = topCpv
                ? (CPV_DIVISIONS[topCpv[0]] || 'Altres serveis comunitaris')
                : 'Altres serveis comunitaris';
            sector = categoriaToSector(categoria);
        }
        result.push({
            nom,
            num_contratos: data.ids.length,
            total_importe: Math.round(data.importe * 100) / 100,
            contratos: data.ids.sort((a, b) => a - b),
            sector,
            categoria,
        });
    }
    result.sort((a, b) => b.num_contratos - a.num_contratos);
    return result;
}

function prepareContracts(contracts) {
    const slugCounts = new Map();
    const legacySeen = new Map();
    for (const contract of contracts) {
        const baseSlug = buildContractSlug(contract);
        slugCounts.set(baseSlug, (slugCounts.get(baseSlug) || 0) + 1);
    }
    for (const contract of contracts) {
        const baseSlug = buildContractSlug(contract);
        const legacyBaseSlug = buildLegacyContractSlug(contract);
        const previousCollisionSlug = slugCounts.get(baseSlug) > 1
            ? `${baseSlug}-${stableHash([contract.fecha, contract.importe, contract.adjudicatario])}`
            : null;
        contract.slug = slugCounts.get(baseSlug) > 1
            ? `${baseSlug}-${stableHash([
                contract.fecha,
                contract.importe,
                contract.adjudicatario,
                contract.numero_lot,
                contract.cpv,
                contract.contracte_origen,
                contract.id,
            ])}`
            : baseSlug;

        const legacyIndex = (legacySeen.get(legacyBaseSlug) || 0) + 1;
        legacySeen.set(legacyBaseSlug, legacyIndex);
        const legacySlug = legacyIndex > 1 ? `${legacyBaseSlug}-${legacyIndex}` : legacyBaseSlug;
        contract.slug_aliases = Array.from(new Set(
            [previousCollisionSlug, legacyBaseSlug, legacySlug].filter(slug => slug && slug !== contract.slug)
        ));
    }
    return contracts;
}

function prepareEmpreses(contracts, existingEmpreses, empresaAliases) {
    const empreses = buildEmpreses(contracts, existingEmpreses);
    for (const empresa of empreses) {
        empresa.firstContractId = Math.min(...empresa.contratos);
    }

    const chronological = [...empreses].sort((first, second) =>
        first.firstContractId - second.firstContractId
    );
    chronological.forEach((empresa, index) => {
        empresa.id = index + 1;
    });

    const seen = new Map();
    for (const empresa of empreses) {
        let slug = buildEmpresaSlug(empresa.nom);
        const index = (seen.get(slug) || 0) + 1;
        seen.set(slug, index);
        if (index > 1) slug = `${slug}-${index}`;
        empresa.slug = slug;
    }

    const aliasSlugMap = buildEmpresaAliasSlugMap(empreses, empresaAliases);
    for (const empresa of empreses) {
        empresa.slug_aliases = Array.from(aliasSlugMap.entries())
            .filter(([, targetSlug]) => targetSlug === empresa.slug)
            .map(([aliasSlug]) => aliasSlug);
    }
    return empreses;
}

async function fetchCoreData() {
    const [snapshotRows, existingEmpreses, empresaAliases] = await Promise.all([
        fetchContractsSnapshot(),
        fetchJsonDataset('/json/empreses.json', 'Empreses'),
        fetchEmpresaAliases(),
    ]);
    const contracts = prepareContracts(snapshotRows);
    const uniqueEmpreses = new Set(contracts.map(contract => contract.adjudicatario).filter(Boolean));
    return {
        contracts,
        empreses: prepareEmpreses(contracts, existingEmpreses, empresaAliases),
        stats: {
            total_contratos: contracts.length,
            importe_total: contracts.reduce((sum, contract) => sum + contract.importe, 0),
            num_empresas: uniqueEmpreses.size,
        },
    };
}
