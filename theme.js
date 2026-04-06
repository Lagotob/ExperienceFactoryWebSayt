/**
 * EXP Factory — qorong'u / yorug' mavzu (localStorage: exp_factory_theme)
 */
(function () {
    var STORAGE_KEY = 'exp_factory_theme';

    function get() {
        var s = localStorage.getItem(STORAGE_KEY);
        return s === 'light' ? 'light' : 'dark';
    }

    function apply(theme) {
        var t = theme === 'light' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', t);
        document.documentElement.style.colorScheme = t === 'light' ? 'light' : 'dark';
        try {
            localStorage.setItem(STORAGE_KEY, t);
        } catch (e) {
            /* ignore */
        }
        document.dispatchEvent(new CustomEvent('exp-theme-change', { detail: { theme: t } }));
    }

    function toggle() {
        apply(get() === 'dark' ? 'light' : 'dark');
    }

    function init() {
        apply(get());
    }

    window.ExpTheme = { get: get, set: apply, toggle: toggle, init: init };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
