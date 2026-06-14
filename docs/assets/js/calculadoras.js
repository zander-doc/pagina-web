function initCalculadoras() {
    if (window.__calculadorasInitialized) return;

    const remForm = document.getElementById('calc-form-remodelacion');
    const remResult = document.getElementById('result-rem');
    const remValue = document.getElementById('result-value-rem');
    const remNote = document.getElementById('result-note-rem');

    if (remForm) {
        remForm.addEventListener('submit', function (event) {
            event.preventDefault();

            const tipo = document.getElementById('tipo-remodelacion').value;
            const metros = parseFloat(document.getElementById('metros-remodelacion').value || '0');
            const acabado = document.getElementById('acabado-remodelacion').value;
            const urgencia = document.getElementById('urgencia-remodelacion').value;

            if (!tipo || !metros || !acabado || !urgencia) {
                alert('Por favor completa todos los campos.');
                return;
            }

            let basePorMetro = 0;
            switch (tipo) {
                case 'remodelacion': basePorMetro = 120; break;
                case 'ampliacion': basePorMetro = 150; break;
                case 'mantenimiento': basePorMetro = 80; break;
                case 'construccion': basePorMetro = 200; break;
            }

            if (acabado === 'estandar') basePorMetro *= 1.2;
            if (acabado === 'premium') basePorMetro *= 1.5;
            if (urgencia === 'rapido') basePorMetro *= 1.15;

            const estimadoBase = basePorMetro * metros;
            const min = Math.round(estimadoBase * 0.9);
            const max = Math.round(estimadoBase * 1.15);

            const formatUSD = (value) =>
                value.toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    maximumFractionDigits: 0
                });

            if (remValue) {
                remValue.textContent = `${formatUSD(min)} – ${formatUSD(max)}`;
            }

            if (remNote) {
                remNote.textContent = 'Este es un rango estimado para ayudarte a tener una idea inicial. El presupuesto final se define tras visita técnica y selección de materiales.';
            }

            if (remResult) {
                remResult.style.display = 'block';
                remResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    const el = (id) => document.getElementById(id);

    const calidadSelect = el('calidad-construccion');
    const manualToggle = el('manualToggle-construccion');

    function actualizarCostosAutomaticos() {
        if (manualToggle && manualToggle.checked) return;

        const calidad = calidadSelect ? calidadSelect.value : 'estandar';
        let materiales = 0;
        let mano = 0;
        let otros = 0;

        if (calidad === 'economica') {
            materiales = 140;
            mano = 75;
            otros = 25;
        } else if (calidad === 'estandar') {
            materiales = 175;
            mano = 90;
            otros = 30;
        } else if (calidad === 'premium') {
            materiales = 230;
            mano = 115;
            otros = 40;
        }

        if (el('materiales-construccion')) el('materiales-construccion').value = materiales;
        if (el('mano_obra-construccion')) el('mano_obra-construccion').value = mano;
        if (el('otros-construccion')) el('otros-construccion').value = otros;
    }

    if (calidadSelect) {
        calidadSelect.addEventListener('change', actualizarCostosAutomaticos);
    }

    if (manualToggle) {
        manualToggle.addEventListener('change', function () {
            const fields = ['materiales-construccion', 'mano_obra-construccion', 'otros-construccion'];
            fields.forEach((id) => {
                const input = el(id);
                if (input) {
                    input.readOnly = !manualToggle.checked;
                    input.style.opacity = manualToggle.checked ? '1' : '0.7';
                }
            });
            if (!manualToggle.checked) actualizarCostosAutomaticos();
        });
    }

    actualizarCostosAutomaticos();

    const construccionForm = el('calc-form-construccion');
    if (construccionForm) {
        construccionForm.addEventListener('submit', function (event) {
            event.preventDefault();

            const area = parseFloat(el('area-construccion').value || 0);
            const niveles = parseInt(el('niveles-construccion').value || 1, 10);
            const calidad = el('calidad-construccion').value;
            const ubicacionFactor = parseFloat(el('ubicacion-construccion').value || 1);
            const materiales = parseFloat(el('materiales-construccion').value || 0);
            const manoObra = parseFloat(el('mano_obra-construccion').value || 0);
            const otros = parseFloat(el('otros-construccion').value || 0);
            const indirectosPct = parseFloat(el('indirectos-construccion').value || 0);
            const utilidadPct = parseFloat(el('utilidad-construccion').value || 0);
            const contingenciaPct = parseFloat(el('contingencia-construccion').value || 0);
            const tasa = parseFloat(el('tasa-construccion').value || 0);

            if (!area || area <= 0) {
                if (el('warning-construccion')) {
                    el('warning-construccion').style.display = 'block';
                    el('warning-construccion').textContent = 'Debes ingresar un área válida.';
                }
                return;
            }

            if (el('warning-construccion')) {
                el('warning-construccion').style.display = 'none';
            }

            let calidadFactor = 1;
            if (calidad === 'economica') calidadFactor = 0.9;
            if (calidad === 'premium') calidadFactor = 1.2;

            const costoDirectoM2 = (materiales + manoObra + otros) * calidadFactor * ubicacionFactor;
            const costoDirectoTotal = costoDirectoM2 * area;
            const montoIndirectos = costoDirectoTotal * indirectosPct / 100;
            const montoContingencia = costoDirectoTotal * contingenciaPct / 100;
            const subtotal = costoDirectoTotal + montoIndirectos + montoContingencia;
            const montoUtilidad = subtotal * utilidadPct / 100;
            const totalUSD = subtotal + montoUtilidad;
            const totalM2USD = totalUSD / area;
            const totalBs = tasa ? totalUSD * tasa : null;
            const totalM2Bs = tasa ? totalM2USD * tasa : null;

            const formatUSD = (value) =>
                value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
            const formatBs = (value) =>
                value.toLocaleString('es-VE', { style: 'currency', currency: 'VES', maximumFractionDigits: 2 });

            if (el('total-usd-construccion')) el('total-usd-construccion').textContent = formatUSD(totalUSD);
            if (el('total-bs-construccion')) el('total-bs-construccion').textContent = totalBs ? `Equivalente en bolívares: ${formatBs(totalBs)}` : 'Equivalente en bolívares: —';
            if (el('r-area-construccion')) el('r-area-construccion').textContent = `${area} m²`;
            if (el('r-directo-m2-construccion')) el('r-directo-m2-construccion').textContent = formatUSD(costoDirectoM2);
            if (el('r-directo-total-construccion')) el('r-directo-total-construccion').textContent = formatUSD(costoDirectoTotal);
            if (el('r-indirectos-construccion')) el('r-indirectos-construccion').textContent = formatUSD(montoIndirectos);
            if (el('r-contingencia-construccion')) el('r-contingencia-construccion').textContent = formatUSD(montoContingencia);
            if (el('r-utilidad-construccion')) el('r-utilidad-construccion').textContent = formatUSD(montoUtilidad);
            if (el('r-total-m2-usd-construccion')) el('r-total-m2-usd-construccion').textContent = formatUSD(totalM2USD);
            if (el('r-total-m2-bs-construccion')) el('r-total-m2-bs-construccion').textContent = totalM2Bs ? formatBs(totalM2Bs) : '—';
            if (el('pill-area-construccion')) el('pill-area-construccion').textContent = `${area} m² / ${niveles} nivel(es)`;
            if (el('pill-calidad-construccion')) el('pill-calidad-construccion').textContent = calidad.charAt(0).toUpperCase() + calidad.slice(1);
            if (el('pill-ubicacion-construccion')) {
                const selectedOption = el('ubicacion-construccion').selectedOptions[0];
                if (selectedOption) el('pill-ubicacion-construccion').textContent = selectedOption.textContent;
            }
        });
    }

    if (remForm || construccionForm) {
        window.__calculadorasInitialized = true;
    }
}

window.initCalculadoras = initCalculadoras;
