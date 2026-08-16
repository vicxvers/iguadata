function SearchIcon({ size = 20, strokeWidth = 2 }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
    );
}

function SearchField({ value, onValueChange, placeholder, ariaLabel }) {
    return (
        <div className="search-input-wrapper">
            <span className="search-icon">
                <SearchIcon />
            </span>
            <input
                type="text"
                className="search-input"
                placeholder={placeholder}
                aria-label={ariaLabel}
                value={value}
                onChange={event => onValueChange(event.target.value)}
            />
            {value && (
                <button
                    className="search-clear"
                    onClick={() => onValueChange('')}
                    type="button"
                    aria-label="Netejar cerca"
                >
                    &times;
                </button>
            )}
        </div>
    );
}

function EmptySearchState({ text, onReset }) {
    return (
        <div className="empty-state">
            <div className="empty-state-icon">
                <SearchIcon size={40} strokeWidth={1.5} />
            </div>
            <div className="empty-state-title">Sense resultats</div>
            <div className="empty-state-text">{text}</div>
            <div className="empty-state-action">
                <button className="empty-state-btn" onClick={onReset} type="button">
                    Restablir filtres
                </button>
            </div>
        </div>
    );
}

function Pagination({ currentPage, totalPages, onPageChange, showTitles = true }) {
    const title = label => showTitles ? label : undefined;

    return (
        <div className="pagination">
            <button
                className="pagination-btn"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                title={title("Primera pàgina")}
                type="button"
            >
                «
            </button>
            <button
                className="pagination-btn"
                onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                title={title("Pàgina anterior")}
                type="button"
            >
                ‹
            </button>
            <span className="pagination-info">
                Pàgina <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
            </span>
            <button
                className="pagination-btn"
                onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
                title={title("Pàgina següent")}
                type="button"
            >
                ›
            </button>
            <button
                className="pagination-btn"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                title={title("Última pàgina")}
                type="button"
            >
                »
            </button>
        </div>
    );
}

function FilterActions({ open, onToggle, activeCount, onReset }) {
    return (
        <div className="filter-actions">
            <button
                className="filters-toggle-btn"
                onClick={onToggle}
                aria-expanded={open}
                type="button"
            >
                <span>Filtres</span>
                <span className="filters-toggle-meta">{activeCount}</span>
            </button>
            <button
                className="btn-reset filters-mobile-reset"
                onClick={onReset}
                title="Restablir filtres"
                aria-label="Restablir filtres"
                type="button"
            >
                <svg className="filters-reset-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
            </button>
        </div>
    );
}
