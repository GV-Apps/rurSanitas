document.addEventListener("DOMContentLoaded", () => {
  // ---------------------------------------------------------------
  // DOM refs
  // ---------------------------------------------------------------
  const $ = (s) => document.getElementById(s);
  const loginScreen = $("login-screen");
  const appScreen = $("app-screen");
  const loginForm = $("login-form");
  const loginUser = $("login-user");
  const loginPass = $("login-pass");
  const loginError = $("login-error");
  const togglePass = $("toggle-pass");
  const mainSection    = $("main-section");
  const creadosSection    = $("creados-section");
  const cerradosSection   = $("cerrados-section");
  const pendientesNSection = $("pendientes-n-section");
  const rechazadosNSection = $("rechazados-n-section");
  const pendientesOtraSection     = $("pendientes-otra-regional-section");
  const pendientesValidarSection  = $("pendientes-validar-section");
  const misAuditoriasSection      = $("mis-auditorias-section");
  const formSection = $("form-section");
  const adminSection = $("admin-section");
  const usersSection = $("users-section");
  const prestadoresSection = $("prestadores-section");
  const historialSection    = $("historial-section");
  const solicitudesSection       = $("solicitudes-section");
  const festivosSection          = $("festivos-section");
  const camposSection            = $("campos-section");
  const ciudadCodigosSection     = $("ciudad-codigos-section");
  const auditSection             = $("audit-section");
  const auditoriasActivasSection    = $("auditorias-activas-section");
  const ssoAccessRequestsSection    = $("sso-access-requests-section");
  const finalizadosSection          = $("finalizados-section");
  const enRevisionContralorSection  = $("en-revision-contralor-section");
  const enCursoContralorSection     = $("en-curso-contralor-section");
  const umbralLiderSection          = $("umbral-lider-section");
  const formTitle = $("form-title");
  const dynamicForm = $("dynamic-form");
  const formCardsContainer = $("form-cards-container");
  const btnBack = $("btn-back");
  const btnSubmit      = $("btn-submit");
  const btnReabrir     = $("btn-reabrir-registro");
  const btnRestoreAll  = $("btn-restore-all");
  const btnAprobarN    = $("btn-aprobar-n");
  const btnRechazarN   = $("btn-rechazar-n");
  const btnCancelarN   = $("btn-cancelar-n");
  const btnReactivarN  = $("btn-reactivar-n");
  const btnClear       = $("btn-clear");
  const editBanner = $("edit-banner");
  const editBannerText = $("edit-banner-text");
  const btnLogout = $("btn-logout");
  const mainEmpty    = $("main-empty");
  const mainCount    = $("main-count");
  const mainSearch   = $("main-search");
  const mainSections = $("main-sections");
  const mainFilters  = $("main-filters");
  const filterGestor = $("filter-gestor");
  const filterRegion = $("filter-region");
  const filterLider  = $("filter-lider");

  let currentRole = null;     // rol activo (= sessionRol)
  let currentFields = [];     // campos del rol activo
  let currentEditId    = null; // null = crear, número = editar
  let _originalCampos  = {};  // valores guardados al abrir un registro para editar
  let _reaperturaLiderCount = 0; // veces que el lider reabrió este registro (max 1)
  let sessionRol      = null;  // rol de la sesión
  let sessionPermisos = [];    // lista de permisos del usuario
  let sessionIsAdmin  = false; // si es admin
  let sessionRegional = null;  // regional del usuario (para auto-fill)
  let sessionNombre   = null;  // nombre_completo del usuario en sesión
  let sessionUsuario  = null;  // username del usuario en sesión
  let allMainRecords = [];    // página actual (compatibilidad con export)
  let _currentPrestData = null; // datos del prestador activo (para fórmulas VLOOKUP)
  let activeGestorFilter = "";
  let activeRegionFilter = "";
  let activeLiderFilter  = "";
  let _resumenSecciones  = {}; // conteos de secciones desde servidor
  let _searchDebounceTimer = null;
  let _lastResumen = null;

  // ---------------------------------------------------------------
  // CUOTAS: Definición de duplas y sets de códigos
  // ---------------------------------------------------------------
  const _CUOTA_DEF = [
    { n: 1,  monto: "BI", fecha_tent: "BJ", fecha_real: "CK" },
    { n: 2,  monto: "BK", fecha_tent: "BL", fecha_real: "CL" },
    { n: 3,  monto: "BM", fecha_tent: "BN", fecha_real: "CM" },
    { n: 4,  monto: "BO", fecha_tent: "BP", fecha_real: "CN" },
    { n: 5,  monto: "BQ", fecha_tent: "BR", fecha_real: "CO" },
    { n: 6,  monto: "BS", fecha_tent: "BT", fecha_real: "CP" },
    { n: 7,  monto: "BU", fecha_tent: "BV", fecha_real: "CQ" },
    { n: 8,  monto: "BW", fecha_tent: "BX", fecha_real: "CR" },
    { n: 9,  monto: "DX", fecha_tent: "DY", fecha_real: "EF" },
    { n: 10, monto: "DZ", fecha_tent: "EA", fecha_real: "EG" },
    { n: 11, monto: "EB", fecha_tent: "EC", fecha_real: "EH" },
    { n: 12, monto: "ED", fecha_tent: "EE", fecha_real: "EI" },
    { n: 13, monto: "EJ", fecha_tent: "EK", fecha_real: "ET" },
    { n: 14, monto: "EL", fecha_tent: "EM", fecha_real: "EU" },
    { n: 15, monto: "EN", fecha_tent: "EO", fecha_real: "EV" },
    { n: 16, monto: "EP", fecha_tent: "EQ", fecha_real: "EW" },
    { n: 17, monto: "ER", fecha_tent: "ES", fecha_real: "EX" },
    { n: 18, monto: "ET", fecha_tent: "EU", fecha_real: "EY" },
    { n: 19, monto: "EV", fecha_tent: "EW", fecha_real: "EZ" },
    { n: 20, monto: "EX", fecha_tent: "EY", fecha_real: "FA" },
    { n: 21, monto: "EZ", fecha_tent: "FA", fecha_real: "FB" },
    { n: 22, monto: "FB", fecha_tent: "FC", fecha_real: "FD" },
    { n: 23, monto: "FD", fecha_tent: "FE", fecha_real: "FF" },
    { n: 24, monto: "FF", fecha_tent: "FG", fecha_real: "FH" },
  ];
  const _CUOTA_G2_SET  = new Set(["BI","BJ","BK","BL","BM","BN","BO","BP","BQ","BR","BS","BT","BU","BV","BW","BX","DX","DY","DZ","EA","EB","EC","ED","EE","EJ","EK","EL","EM","EN","EO","EP","EQ","ER","ES","ET","EU","EV","EW","EX","EY","EZ","FA","FB","FC","FD","FE","FF","FG"]);
  const _CUOTA_CR_SET  = new Set(["CK","CL","CM","CN","CO","CP","CQ","CR","EF","EG","EH","EI","ET","EU","EV","EW","EX","EY","EZ","FA","FB","FD","FF","FH"]);
  const _ALL_CUOTA_SET = new Set([..._CUOTA_G2_SET, ..._CUOTA_CR_SET]);
  const _MAX_CUOTAS    = 24;
  const _NUMERIC_TIPOS = new Set(["numerico", "entero", "monetario", "porcentaje", "numero", "moneda"]);

  // ── Widget de Devoluciones/Retroalimentaciones ──────────────────────────────
  const _DEV_DEF = [
    { n: 1, proceso: "DB", fecha: "DC", tipo: "DD", responsable: "DE", caso: "DF" },
    { n: 2, proceso: "DG", fecha: "DH", tipo: "DI", responsable: "DJ", caso: "DK" },
    { n: 3, proceso: "FI", fecha: "FJ", tipo: "FK", responsable: "FL", caso: "FM" },
    { n: 4, proceso: "FN", fecha: "FO", tipo: "FP", responsable: "FQ", caso: "FR" },
    { n: 5, proceso: "FS", fecha: "FT", tipo: "FU", responsable: "FV", caso: "FW" },
  ];
  const _DEV_SET = new Set(["DB","DC","DD","DE","DF","DG","DH","DI","DJ","DK","FI","FJ","FK","FL","FM","FN","FO","FP","FQ","FR","FS","FT","FU","FV","FW"]);
  const _MAX_DEV = 5;
  // ───────────────────────────────────────────────────────────────────────────

  // Códigos de cuotas eliminados por el usuario (para limpiarlos en el PUT)
  let _clearedCuotaCodes = new Set();
  // Si true, el submit guardará Y validará en un solo clic
  let _pendingValidar = false;
  // Si true, BY=ENVIADA A CONTROLAR MEDICO NACIONAL → formulario bloqueado para no-CONTRALOR
  let _byEnviadaLocked = false;
  // Configuración de umbral LIDER→CONTRALOR (cargada al iniciar sesión)
  let _umbralLiderConfig = null;

  // Constantes de estado BY controlado
  const _BY_ENVIADA_VAL  = "ENVIADA A CONTROLAR MEDICO NACIONAL";
  const _BY_DEVUELTO_VAL = "DEVUELTO COMO CONTRARLO PARA REVISION";

  // Muestra el modal de motivo de devolución y retorna el texto ingresado,
  // o null si el usuario cancela.
  function _pedirMotivoDevolucion() {
    return new Promise(resolve => {
      const overlay  = document.getElementById("devolucion-motivo-overlay");
      const textarea = document.getElementById("devolucion-motivo-input");
      const errMsg   = document.getElementById("devolucion-motivo-error");
      const btnOk    = document.getElementById("btn-devolucion-confirmar");
      const btnCan   = document.getElementById("btn-devolucion-cancelar");

      textarea.value = "";
      errMsg.style.display = "none";
      overlay.classList.remove("hidden");
      textarea.focus();

      function cleanup() {
        overlay.classList.add("hidden");
        btnOk.removeEventListener("click", onOk);
        btnCan.removeEventListener("click", onCancel);
      }
      function onOk() {
        const val = textarea.value.trim();
        if (!val) { errMsg.style.display = "block"; return; }
        cleanup();
        resolve(val);
      }
      function onCancel() { cleanup(); resolve(null); }

      btnOk.addEventListener("click", onOk);
      btnCan.addEventListener("click", onCancel);
    });
  }

  // Muestra el modal de decisión de finalización de proceso (Contralor).
  // Retorna "finalizar" | "solo_actualizar" | null (cancelar).
  function _pedirDecisionFinalizar() {
    return new Promise(resolve => {
      const overlay       = $("finalizar-proceso-overlay");
      if (!overlay) { resolve(null); return; }
      const btnAceptar    = $("btn-finalizar-aceptar");
      const btnSoloUpd    = $("btn-finalizar-solo-actualizar");
      const btnCancelar   = $("btn-finalizar-cancelar");
      overlay.classList.remove("hidden");

      function cleanup() {
        overlay.classList.add("hidden");
        btnAceptar.onclick  = null;
        btnSoloUpd.onclick  = null;
        btnCancelar.onclick = null;
      }
      btnAceptar.onclick  = () => { cleanup(); resolve("finalizar"); };
      btnSoloUpd.onclick  = () => { cleanup(); resolve("solo_actualizar"); };
      btnCancelar.onclick = () => { cleanup(); resolve(null); };
    });
  }

  // Muestra el modal de motivo de cierre (AC/BD/CE) y retorna el texto ingresado,
  // o null si el usuario cancela.
  function _pedirMotivoCierre() {
    return new Promise(resolve => {
      const overlay  = document.getElementById("cierre-motivo-overlay");
      const textarea = document.getElementById("cierre-motivo-input");
      const errMsg   = document.getElementById("cierre-motivo-error");
      const btnOk    = document.getElementById("btn-cierre-motivo-confirmar");
      const btnCan   = document.getElementById("btn-cierre-motivo-cancelar");

      textarea.value = "";
      errMsg.style.display = "none";
      overlay.classList.remove("hidden");
      textarea.focus();

      function cleanup() {
        overlay.classList.add("hidden");
        btnOk.removeEventListener("click", onOk);
        btnCan.removeEventListener("click", onCancel);
      }
      function onOk() {
        const val = textarea.value.trim();
        if (!val) { errMsg.style.display = "block"; return; }
        cleanup();
        resolve(val);
      }
      function onCancel() { cleanup(); resolve(null); }

      btnOk.addEventListener("click", onOk);
      btnCan.addEventListener("click", onCancel);
    });
  }

  function _showSoftWarningsModal(warnings) {
    return new Promise(resolve => {
      const overlay = document.getElementById("soft-warnings-modal-overlay");
      const list    = document.getElementById("soft-warnings-list");
      const btnOk   = document.getElementById("btn-soft-warnings-continue");
      const btnCan  = document.getElementById("btn-soft-warnings-cancel");
      list.innerHTML = warnings.map(w => `<li>${w}</li>`).join("");
      overlay.classList.remove("hidden");
      function cleanup() {
        overlay.classList.add("hidden");
        list.innerHTML = "";
        btnOk.removeEventListener("click", onOk);
        btnCan.removeEventListener("click", onCancel);
      }
      function onOk()    { cleanup(); resolve(true);  }
      function onCancel(){ cleanup(); resolve(false); }
      btnOk.addEventListener("click", onOk);
      btnCan.addEventListener("click", onCancel);
    });
  }

  // ── Configuración umbral LIDER→CONTRALOR ──────────────────────────────────

  /** Carga la configuración de umbral LIDER→CONTRALOR desde el backend. */
  async function _fetchUmbralLiderConfig() {
    try {
      const res = await fetch(`${BASE}/api/config-umbral-lider`);
      if (res.ok) {
        _umbralLiderConfig = await res.json();
      }
    } catch { /* ignorar: sin config activa */ }
  }

  /**
   * Evalúa si el LIDER actual tiene acceso extendido a campos CONTRALOR para
   * el registro cuyas campos se reciben como argumento.
   * Condición: BY == ENVIADA && campo_moneda <= umbral configurado.
   */
  function _liderTieneAccesoContralor(camposRecord) {
    if (!sessionPermisos.includes("LIDER") || sessionIsAdmin) return false;
    if (!_umbralLiderConfig || !_umbralLiderConfig.activo || !_umbralLiderConfig.campo_codigo) return false;
    const byVal = ((camposRecord && camposRecord["BY"]) || "").trim();
    if (byVal !== _BY_ENVIADA_VAL) return false;
    const campoVal = parseFloat((camposRecord && camposRecord[_umbralLiderConfig.campo_codigo]) || 0);
    const umbral   = parseFloat(_umbralLiderConfig.umbral || 0);
    if (isNaN(campoVal) || isNaN(umbral)) return false;
    return campoVal <= umbral;
  }

  // Roles inferiores visibles por jerarquía fija (debe coincidir con HIERARCHY del backend)
  // Solo se usa como flag para saber si llamar a /api/campos-secciones
  const ROLE_LOWER_ROLES = {
    "GESTOR 1":  [],
    "GESTOR 2":  ["GESTOR 1"],
    "LIDER":     ["GESTOR 1"],
    "CONTRALOR": ["GESTOR 1", "GESTOR 2"],
    "ADMIN":     ["GESTOR 1", "GESTOR 2", "LIDER"],
  };

  // Colores y etiquetas por rol para las secciones
  const ROL_META = {
    "GESTOR 1":         { color: "#0B7A75", bg: "#E6F5F4", label: "Gestor 1" },
    "GESTOR 2":         { color: "#1565C0", bg: "#E3F2FD", label: "Gestor 2" },
    "LIDER":            { color: "#6A1B9A", bg: "#F3E5F5", label: "Líder" },
    "COORDINADOR":      { color: "#E65100", bg: "#FFF3E0", label: "Coordinador" },
    "GESTOR 2 / LIDER": { color: "#1A6B8A", bg: "#E0F4F8", label: "Gestor 2 / Líder" },
    "CONTRALOR":        { color: "#BF360C", bg: "#FBE9E7", label: "Contralor" },
    "ADMIN":            { color: "#37474F", bg: "#ECEFF1", label: "Admin" },
  };

  const fieldSearch = $("field-search");
  const fieldSearchClear = $("field-search-clear");
  const fieldSearchCount = $("field-search-count");

  // Listener de delegación para AC (manejo robusto ante DOM dinámico)
  document.addEventListener("change", function(evt) {
    const el = evt.target;
    if (!el) return;
    const name = (el.name ||   "").toString().toLowerCase();
    const id   = (el.id   ||   "").toString().toLowerCase();

    // ---- Listener para AC (estado de cierre) ----
    const isAC = id === "field_ac" || name === "field_ac" || id === "ac" || name === "ac" || id.includes("ac");
    if (isAC) {
      const val = el.value || "";
      const allowed = [
        "CERRADO POR CANCELACION DE MESA",
        "CERRADO POR CANCELACION DE MESAS",
        "CERRADO SIN FINALIZACIÓN",
        "IPS NO ASISTE A MESAS"
      ];
      const norm = val.toString().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const isClosing = allowed
        .map(v => v.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
        .includes(norm);
      if (isClosing) {
        // Guardar referencia y valor previo para que el botón Cancelar pueda revertir
        _acCurrentElement = el;
        _acPrevValue = (el.dataset._prevACValue || "");  // valor antes del cierre
        // NO actualizar _prevACValue aquí — se actualiza en ok/cancel handler
        // Mostrar modal propio
        const modal = document.getElementById("ac-close-modal-overlay");
        if (modal) {
          modal.classList.remove("hidden");
        }
      } else {
        el.dataset._prevACValue = val;
        _applyACCierreLock(); // Desbloquear formulario si AC cambia a valor no-cierre
        if (!_anyLockActive()) _setCFCGVisibility(false, true);
      }
      return;
    }

    // ---- Listener para BH (validar que no supere 100%) ----
    const isBH = id === "field_bh" || name === "field_bh" || id === "bh" || name === "bh" || id.includes("bh");
    if (isBH) {
      const bhVal = (el.value || "").toString().trim();
      if (bhVal) {
        const bhNumerico = parseFloat(bhVal.toString().replace(/[^\d.,-]/g, ''));
        if (!isNaN(bhNumerico) && bhNumerico > 100) {
          showToast(`⚠️ BH no puede superar el 100%. Valor actual: ${bhVal}`, "error");
          el.classList.add("field-required-error");
        } else {
          el.classList.remove("field-required-error");
        }
      } else {
        el.classList.remove("field-required-error");
      }
      return;
    }

    // ---- Listener para AK y BE (validación de compatibilidad) ----
    const isAK = id === "field_ak" || name === "field_ak" || id === "ak" || name === "ak" || id.includes("ak");
    const isBE = id === "field_be" || name === "field_be" || id === "be" || name === "be" || id.includes("be");

    if (isAK || isBE) {
      const akEl = dynamicForm.querySelector('[name="field_AK"], [id="field_AK"], [data-field-code="AK"]');
      const beEl = dynamicForm.querySelector('[name="field_BE"], [id="field_BE"], [data-field-code="BE"]');

      const akVal = (akEl ? akEl.value : "").toString().trim();
      const beVal = (beEl ? beEl.value : "").toString().trim();

      if (akVal && beVal) {
        const akInicia = akVal.substring(0, 1).toUpperCase();
        let errorMsg = null;

        // Validar según regla de AK
        if ((akInicia === "B" || akInicia === "C") && beVal !== "NO QUEDARON SALDOS DE GLOSA POR CONCILIAR") {
          errorMsg = `AK inicia con "${akInicia}" → BE debe ser "NO QUEDARON SALDOS DE GLOSA POR CONCILIAR"`;
          if (beEl) beEl.classList.add("field-required-error");
        } else if (akInicia === "A" && !["ADTIVA/PARETO", "UNO A UNO"].includes(beVal)) {
          errorMsg = `AK inicia con "A" → BE debe ser "ADTIVA/PARETO" o "UNO A UNO"`;
          if (beEl) beEl.classList.add("field-required-error");
        } else {
          // Validación pasada, limpiar error
          if (beEl) beEl.classList.remove("field-required-error");
        }

        // Mostrar u ocultar advertencia
        let warningEl = beEl ? beEl.dataset._akBeWarning : null;
        if (errorMsg && beEl) {
          if (!warningEl) {
            // Crear elemento de advertencia si no existe
            const warning = document.createElement("span");
            warning.style.cssText = "color:#DC2626;font-size:.85rem;margin-top:.25rem;display:block";
            warning.textContent = "⚠️ " + errorMsg;
            beEl.parentElement.appendChild(warning);
            beEl.dataset._akBeWarning = true;
          }
        } else if (warningEl && beEl) {
          // Remover advertencia
          const parent = beEl.parentElement;
          if (parent) {
            const warnings = parent.querySelectorAll("span");
            warnings.forEach(w => {
              if (w.textContent.includes("AK inicia") || w.textContent.includes("AK termina")) {
                w.remove();
              }
            });
          }
          delete beEl.dataset._akBeWarning;
        }
      }
      return;
    }

    // ---- Listener para BD (estado cierre finiquito) ----
    const isBD = id === "field_bd" || name === "field_bd" || id === "bd" || name === "bd" || id.includes("bd");
    if (isBD) {
      const newVal = el.value || "";
      const oldBDVal = (el.dataset._prevBDValue || "").trim();
      const norm = newVal.toString().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const oldNorm = oldBDVal.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const isCerradoSinFin = norm === "CERRADO SIN FINALIZACION";
      const isEnTramite = norm === "EN TRAMITE";
      const isTramitado = norm === "TRAMITADO";
      const wasTramitado = oldNorm === "TRAMITADO";

      // Validar permiso por rol
      const rol = (currentRole || "").trim().toUpperCase();
      const esGestorOLiderBD = (rol.includes("GESTOR 2") || rol === "LIDER") && !sessionIsAdmin;
      let roleError = null;

      if (newVal) {
        // Si BD YA estaba en TRAMITADO y es GESTOR/LIDER, no puede cambiarlo
        if (wasTramitado && esGestorOLiderBD) {
          roleError = `El proceso se encuentra en estado TRAMITADO (BD). Solo el Contralor o Administración pueden modificarlo.`;
        }
        // GESTOR 2 y LIDER solo pueden usar EN TRAMITE o CERRADO SIN FINALIZACIÓN
        else if (esGestorOLiderBD && !(isEnTramite || isCerradoSinFin)) {
          roleError = `El rol ${currentRole} solo puede usar "EN TRAMITE" o "CERRADO SIN FINALIZACIÓN"`;
        }
        // CONTRALOR no puede seleccionar "CERRADO SIN FINALIZACIÓN"
        else if (rol.includes("CONTRALOR") && !sessionIsAdmin && isCerradoSinFin) {
          roleError = `El rol CONTRALOR no puede establecer "CERRADO SIN FINALIZACIÓN" en BD.`;
        }
      }

      // Si hay error de rol, revertir al valor anterior y mostrar toast
      if (roleError) {
        el.value = oldBDVal;
        el.dataset.rawValue = oldBDVal;
        showToast(`❌ ${roleError}`, "error");
        return;
      }

      // Si pasa validación de rol y selecciona "CERRADO SIN FINALIZACIÓN", mostrar modal
      if (isCerradoSinFin) {
        // Guardar el valor anterior para poder revertir si cancela
        _bdPrevValue = el.dataset._prevBDValue || "";
        _bdCurrentElement = el;

        // Mostrar modal de confirmación
        const modal = document.getElementById("bd-close-modal-overlay");
        if (modal) {
          modal.classList.remove("hidden");
        }
      } else if (!isCerradoSinFin) {
        el.dataset._prevBDValue = newVal;
        _applyBDCierreLock(); // Desbloquear formulario si BD cambia a valor no-cierre
        if (!_anyLockActive()) _setCFCGVisibility(false, true);
      }
      return;
    }

    // ---- Listener para BY (solo LIDER puede establecer ENVIADA A CONTROLAR MEDICO NACIONAL) ----
    const _byFieldCode = (el.dataset && el.dataset.fieldCode) ? (el.dataset.fieldCode || "").toLowerCase() : "";
    const isBY = id === "field_by" || name === "field_by" || _byFieldCode === "by";
    if (isBY) {
      const _byNewVal = (el.value || "").trim();
      const _byOldVal = (el.dataset._prevBYValue || "").trim();
      if (_byNewVal === _BY_ENVIADA_VAL && _byNewVal !== _byOldVal) {
        const _rolBY = (currentRole || "").toUpperCase();
        if (_rolBY !== "LIDER" && !sessionIsAdmin) {
          el.value = _byOldVal;
          showToast("❌ Solo el LIDER puede marcar el estado 'ENVIADA A CONTROLAR MEDICO NACIONAL'. El GESTOR 2 no tiene esta autorización.", "error");
          return;
        }
      }
      el.dataset._prevBYValue = _byNewVal;
      return;
    }

    // ---- Listener para CE (estado tramitado - finiquito) ----
    const ceFieldCode = (el.dataset && el.dataset.fieldCode) ? (el.dataset.fieldCode || "").toLowerCase() : "";
    const isCE = id === "field_ce" || name === "field_ce" || ceFieldCode === "ce";
    if (isCE) {
      const newVal = el.value || "";
      const oldVal = el.dataset._prevCEValue || "";
      const norm = newVal.toString().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const oldNorm = oldVal.toString().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const isTramitado = norm === "TRAMITADO";
      const wasTramitado = oldNorm === "TRAMITADO";

      // Validar permiso por rol: solo CONTRALOR puede establecer TRAMITADO
      const rol = (currentRole || "").trim().toUpperCase();
      let roleError = null;

      // Primera prioridad: si CE YA ESTABA en TRAMITADO, ningún otro rol puede modificarlo
      if (wasTramitado && newVal !== oldVal) {
        // Si CE estaba en TRAMITADO y el usuario (no CONTRALOR) intenta modificarlo
        if (rol !== "CONTRALOR") {
          roleError = `El proceso se encuentra en estado TRAMITADO. En este momento solo el rol de CONTRALOR puede hacer cualquier modificación.`;
        }
      } else if (newVal && isTramitado && newVal !== oldVal) {
        // Segunda prioridad: si el usuario intenta CAMBIAR A TRAMITADO
        // Solo CONTRALOR puede usar TRAMITADO
        if (rol !== "CONTRALOR") {
          roleError = `Solo el rol CONTRALOR puede establecer "TRAMITADO". Su rol es ${currentRole}`;
        }
      }

      // Si hay error de rol, revertir al valor anterior y mostrar toast
      if (roleError) {
        el.value = oldVal;
        el.dataset.rawValue = oldVal;
        showToast(`❌ ${roleError}`, "error");
        return;
      }

      // Si CE = TRAMITADO (o deja de serlo), delegar al lock centralizado
      _applyCETramitadoLock();

      // Cierre de CE: mostrar modal de confirmación
      const _isCECierre = _CE_CIERRE_VALS_LOCK.includes(newVal.trim());
      if (_isCECierre) {
        _cePrevValue = el.dataset._prevCEValue || "";
        _ceCurrentElement = el;
        const ceModal = document.getElementById("ce-close-modal-overlay");
        if (ceModal) ceModal.classList.remove("hidden");
      } else {
        _applyCECierreLock(); // desbloquea si estaba bloqueado por CE
        if (!_anyLockActive()) _setCFCGVisibility(false, true);
      }

      // Guardar el valor actual de CE para futuras comparaciones
      el.dataset._prevCEValue = newVal;
      return;
    }
  });

  // ---------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------
  function showToast(msg, type = "success", duration = 3000) {
    const SNACKBAR_CFG = {
      success: { title: "Éxito",        icon: "fa-solid fa-circle-check" },
      error:   { title: "Error",         icon: "fa-solid fa-circle-xmark" },
      warning: { title: "Advertencia",   icon: "fa-solid fa-triangle-exclamation" },
      info:    { title: "Información",   icon: "fa-solid fa-circle-info" },
    };
    const cfg     = SNACKBAR_CFG[type] || SNACKBAR_CFG.success;
    const toast   = $("toast");
    const iconEl  = $("toast-icon");
    const titleEl = $("toast-title");
    const descEl  = $("toast-desc");
    const closeEl = $("toast-close");

    iconEl.innerHTML     = `<i class="${cfg.icon}"></i>`;
    titleEl.textContent  = cfg.title;
    descEl.textContent   = msg;
    toast.className      = `toast ${type}`;
    toast.classList.remove("hidden");

    if (toast._hideTimer) clearTimeout(toast._hideTimer);
    toast._hideTimer = null;

    // Las notificaciones de error no se cierran automáticamente
    if (type !== "error") {
      toast._hideTimer = setTimeout(() => toast.classList.add("hidden"), duration);
    }

    closeEl.onclick = () => {
      clearTimeout(toast._hideTimer);
      toast.classList.add("hidden");
      // Limpiar posición arrastrada al cerrar
      toast.style.left = "";
      toast.style.top  = "";
      toast.style.bottom = "";
      toast.style.transform = "";
    };

    // Si es un error de validación de formulario, desplazar al primer campo marcado en rojo.
    // requestAnimationFrame garantiza que el DOM ya tiene la clase antes de buscar.
    if (type === "error") {
      requestAnimationFrame(() => {
        const firstErr = dynamicForm?.querySelector?.(".field-required-error");
        if (firstErr) firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }

    // Drag: reactivar en cada apertura del toast
    if (!toast._dragInit) {
      toast._dragInit = true;
      let dragging = false, startX, startY, origLeft, origTop;

      toast.addEventListener("mousedown", (e) => {
        if (e.target === closeEl || closeEl.contains(e.target)) return;
        dragging = true;
        const rect = toast.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        origLeft = rect.left;
        origTop  = rect.top;
        // Fijar posición absoluta para poder moverlo libremente
        toast.style.transform  = "none";
        toast.style.bottom     = "auto";
        toast.style.left       = origLeft + "px";
        toast.style.top        = origTop  + "px";
        toast.style.cursor     = "grabbing";
        e.preventDefault();
      });

      document.addEventListener("mousemove", (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        toast.style.left = (origLeft + dx) + "px";
        toast.style.top  = (origTop  + dy) + "px";
      });

      document.addEventListener("mouseup", () => {
        if (!dragging) return;
        dragging = false;
        toast.style.cursor = "grab";
      });
    }
  }

  const SECTION_VIEW = new Map(); // populated after sections are defined

  // _fromHistory = true cuando la llamada viene desde el popstate handler,
  // para no duplicar entradas en el historial del navegador.
  function showSection(section, _fromHistory = false) {
    [mainSection, creadosSection, cerradosSection, pendientesNSection, rechazadosNSection, pendientesOtraSection, pendientesValidarSection, misAuditoriasSection, finalizadosSection, enRevisionContralorSection, enCursoContralorSection, formSection, adminSection, usersSection, prestadoresSection, historialSection, solicitudesSection, festivosSection, camposSection, ciudadCodigosSection, auditSection, auditoriasActivasSection, umbralLiderSection, ssoAccessRequestsSection].forEach(s => s && s.classList.add("hidden"));
    section.classList.remove("hidden");

    // Inyectar el bloque de filtros compartido justo después del records-toolbar de la sección activa
    const toolbar = section.querySelector(".records-toolbar");
    if (toolbar) {
      toolbar.insertAdjacentElement("afterend", mainFilters);
    }

    // Sidebar active state
    const viewKey = SECTION_VIEW.get(section);
    document.querySelectorAll(".sidebar-item[data-view]").forEach(item => {
      item.classList.toggle("active", item.dataset.view === viewKey);
    });

    // Historial del navegador: registrar cada cambio de vista para que el botón
    // "atrás" del navegador navege entre vistas internas en lugar de salir de la app.
    if (!_fromHistory && section.id) {
      history.pushState({ spaSection: section.id }, "");
    }
  }

  // Escuchar el evento "atrás/adelante" del navegador y restaurar la vista correcta.
  window.addEventListener("popstate", (evt) => {
    if (evt.state && evt.state.spaSection) {
      const targetSection = document.getElementById(evt.state.spaSection);
      if (targetSection) {
        showSection(targetSection, true); // restaurar sin crear nueva entrada
        return;
      }
    }
    // Sin estado SPA válido (el usuario llegó antes del primer pushState):
    // evitar salir de la app reemplazando el entry actual y mostrando main.
    if (mainSection) {
      history.replaceState({ spaSection: mainSection.id }, "");
      showSection(mainSection, true);
    }
  });

  // ---------------------------------------------------------------
  // AUTH: Toggle password visibility
  // ---------------------------------------------------------------
  togglePass.addEventListener("click", () => {
    const isPassword = loginPass.type === "password";
    loginPass.type = isPassword ? "text" : "password";
    $("eye-open").classList.toggle("hidden", !isPassword);
    $("eye-closed").classList.toggle("hidden", isPassword);
  });

  // ---------------------------------------------------------------
  // AUTH: Microsoft EntraID SSO
  // ---------------------------------------------------------------

  // Consultar si EntraID está configurado y ajustar UI de login
  async function _loadMicrosoftAuthConfig() {
    try {
      const res  = await fetch("/api/auth/microsoft/config");
      const data = await res.json();
      if (!data.microsoft_available) return;
      // Mostrar botón Microsoft y ocultar el formulario por defecto
      $("btn-microsoft-login")?.classList.remove("hidden");
      $("microsoft-auth-separator")?.classList.remove("hidden");
      $("password-login-section")?.classList.add("hidden");
      $("password-login-toggle")?.classList.remove("hidden");
    } catch { /* silencioso: sin EntraID el login clásico sigue funcionando */ }
  }

  // Procesar parámetros de redirect de Microsoft en la URL
  function _handleMicrosoftCallback() {
    const params    = new URLSearchParams(window.location.search);
    const msLogin   = params.get("ms_login");
    const msError   = params.get("ms_error");

    if (msLogin || msError) {
      window.history.replaceState({}, "", "/");
    }

    if (msLogin === "ok") return; // checkSession() detectará la sesión activa

    if (msError === "not_found") {
      const email  = params.get("email")  || "";
      const nombre = params.get("nombre") || "";
      _showSsoNotFoundModal(email, nombre);
    } else if (msError === "not_configured") {
      loginError.textContent = "Microsoft EntraID no está configurado. Contacte al administrador.";
      loginError.classList.remove("hidden");
    } else if (msError === "auth_failed") {
      loginError.textContent = "Error al autenticar con Microsoft. Intente nuevamente.";
      loginError.classList.remove("hidden");
    } else if (msError === "no_email") {
      loginError.textContent = "No se pudo obtener el correo de la cuenta Microsoft.";
      loginError.classList.remove("hidden");
    }
  }

  function _showSsoNotFoundModal(email, nombre) {
    const modal   = $("sso-not-found-modal");
    const msg     = $("sso-not-found-msg");
    const sent    = $("sso-request-sent");
    const form    = $("sso-request-form");
    const comment = $("sso-request-comment");

    msg.textContent = `El correo ${email} no está registrado en el sistema. Puedes enviar una solicitud de acceso al administrador.`;
    sent.classList.add("hidden");
    form.classList.remove("hidden");
    if (comment) comment.value = "";
    modal.classList.remove("hidden");
    modal.dataset.email  = email;
    modal.dataset.nombre = nombre;
  }

  // Botón: Continuar con Microsoft
  $("btn-microsoft-login")?.addEventListener("click", () => {
    window.location.href = "/api/auth/microsoft";
  });

  // Link: mostrar formulario de contraseña
  $("btn-show-password-login")?.addEventListener("click", () => {
    $("password-login-section")?.classList.remove("hidden");
    $("password-login-toggle")?.classList.add("hidden");
    $("microsoft-auth-separator")?.classList.add("hidden");
  });

  // Modal SSO no encontrado — cancelar
  $("btn-sso-request-cancel")?.addEventListener("click", () => {
    $("sso-not-found-modal")?.classList.add("hidden");
  });

  // Modal SSO no encontrado — cerrar tras enviar
  $("btn-sso-request-close")?.addEventListener("click", () => {
    $("sso-not-found-modal")?.classList.add("hidden");
  });

  // Modal SSO no encontrado — enviar solicitud
  $("btn-sso-request-send")?.addEventListener("click", async () => {
    const modal   = $("sso-not-found-modal");
    const comment = ($("sso-request-comment")?.value || "").trim();
    const btn     = $("btn-sso-request-send");
    btn.disabled = true;
    btn.textContent = "Enviando...";
    try {
      const res = await fetch("/api/auth/microsoft/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:      modal.dataset.email  || "",
          nombre:     modal.dataset.nombre || "",
          comentario: comment,
        }),
      });
      if (res.ok) {
        $("sso-request-form").classList.add("hidden");
        $("sso-request-sent").classList.remove("hidden");
      } else {
        showToast("Error al enviar la solicitud.", "error");
      }
    } catch {
      showToast("Error de conexión.", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Enviar solicitud";
    }
  });

  // ---------------------------------------------------------------
  // GLOBAL: Interceptor para sesión expirada (401)
  // Si cualquier petición al servidor devuelve 401, forzar vuelta al login
  // ---------------------------------------------------------------
  // Prefijo de subpath (vacío cuando la app está en la raíz del dominio).
  // El servidor lo inyecta via window.BASE en index.html.
  const BASE = (window.BASE || "").replace(/\/$/, "");

  const _origFetch = window.fetch.bind(window);
  window.fetch = async function (...args) {
    // Si hay prefijo de subpath, anteponerlo a todas las URLs absolutas /api/ y /static/
    if (BASE && typeof args[0] === "string" && args[0].startsWith("/") && !args[0].startsWith(BASE)) {
      args[0] = BASE + args[0];
    }
    const res = await _origFetch(...args);
    if (res.status === 401) {
      // Clonar para que el llamador siga pudiendo leerlo, pero también forzar logout UI
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
      if (!url.includes("/api/login") && !url.includes("/api/session")) {
        // Mostrar aviso y regresar al login
        if (appScreen && !appScreen.classList.contains("hidden")) {
          if (notifPollInterval) { clearInterval(notifPollInterval); notifPollInterval = null; }
          appScreen.classList.add("hidden");
          loginScreen.classList.remove("hidden");
          loginUser.value = "";
          loginPass.value = "";
          showToast("Tu sesión expiró. Vuelve a iniciar sesión.", "error");
        }
      }
    }
    return res;
  };

  // ---------------------------------------------------------------
  // AUTH: Check existing session
  // ---------------------------------------------------------------
  async function checkSession() {
    try {
      const res = await fetch("/api/session");
      const data = await res.json();
      if (data && data.usuario) {
        enterApp(data);
        return;
      }
    } catch {}
    loginScreen.classList.remove("hidden");
  }

  // ---------------------------------------------------------------
  // AUTH: Login
  // ---------------------------------------------------------------
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.classList.add("hidden");

    const usuario = loginUser.value.trim();
    const password = loginPass.value;

    if (!usuario || !password) {
      loginError.textContent = "Por favor ingrese usuario y contrasena.";
      loginError.classList.remove("hidden");
      return;
    }

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        loginError.textContent = data.detail || data.error || "Error al iniciar sesión";
        loginError.classList.remove("hidden");
        loginPass.value = "";
        loginPass.focus();
        return;
      }

      enterApp(data);
    } catch {
      loginError.textContent = "Error de conexion con el servidor.";
      loginError.classList.remove("hidden");
    }
  });

  // ---------------------------------------------------------------
  // AUTH: Enter app after login
  // ---------------------------------------------------------------
  function enterApp(user) {
    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
    sessionRol      = user.rol;
    sessionPermisos = user.permisos || [];
    sessionIsAdmin  = user.is_admin || false;
    sessionRegional = user.regional || null;
    sessionNombre   = user.nombre   || null;
    sessionUsuario  = user.usuario  || null;
    currentRole = user.rol;
    $("nav-user-name").textContent = user.nombre;
    $("nav-user-role").textContent = user.rol;
    // Sidebar admin group solo para ADMIN
    if (sessionIsAdmin) {
      $("sidebar-admin-group").classList.remove("hidden");
      $("nav-auditorias-activas").classList.remove("hidden");
      $("nav-sso-access-requests").classList.remove("hidden");
      _updateAuditoriasBadge();
      _updateSsoRequestsBadge();
    } else {
      $("sidebar-admin-group").classList.add("hidden");
      $("nav-auditorias-activas").classList.add("hidden");
      $("nav-sso-access-requests").classList.add("hidden");
    }
    // Botón "Solicitar Gestor" solo para LIDER o CONTRALOR
    const esSolicitanteGestor = sessionPermisos.includes("LIDER") || sessionPermisos.includes("CONTRALOR");
    if (esSolicitanteGestor) {
      $("nav-solicitar-gestor").classList.remove("hidden");
    } else {
      $("nav-solicitar-gestor").classList.add("hidden");
    }
    // Sección "Registros Finalizados" solo para CONTRALOR y ADMIN
    const esCtrlAdminEnterApp = sessionIsAdmin || sessionPermisos.includes("CONTRALOR");
    if (esCtrlAdminEnterApp) {
      $("nav-finalizados").classList.remove("hidden");
    } else {
      $("nav-finalizados").classList.add("hidden");
    }
    // Renombrar "Registros" → "Registros en Curso" para GESTOR (GESTOR 1 / GESTOR 2)
    const _isGestorRole = !sessionIsAdmin && !sessionPermisos.includes("LIDER") && !sessionPermisos.includes("CONTRALOR");
    const _navRegSpan = document.querySelector("#nav-registros span");
    if (_navRegSpan) _navRegSpan.textContent = _isGestorRole ? "Registros en Curso" : "Registros";
    // Precargar configuración de umbral LIDER→CONTRALOR para evaluación en tiempo real
    _fetchUmbralLiderConfig();
    startNotifPolling();
    updateSolicitudesBadge();
    updateSolGestorBadge();
    if (!sessionIsAdmin) _updateMisAuditoriasBadge();
    initMainView();
  }

  // ---------------------------------------------------------------
  // MAIN VIEW: Inicializar (cargar campos del rol + registros)
  // ---------------------------------------------------------------
  // ---------------------------------------------------------------
  // NAVIGATION: Restaurar estado tras recarga de página
  // ---------------------------------------------------------------
  async function _restoreLastNavState() {
    const lastEditId = sessionStorage.getItem("rur_last_edit_id");
    const lastView   = sessionStorage.getItem("rur_last_view");

    // Prioridad 1: estaba editando un registro → reabrirlo si no expiró
    if (lastEditId) {
      const id        = parseInt(lastEditId, 10);
      const ts        = parseInt(sessionStorage.getItem("rur_last_edit_ts") || "0", 10);
      const elapsed   = Date.now() - ts;
      const maxInactivity = 30 * 60 * 1000; // 30 minutos

      if (!isNaN(id) && elapsed < maxInactivity) {
        try {
          await openEditForm(id, { id });
        } catch {
          sessionStorage.removeItem("rur_last_edit_id");
          sessionStorage.removeItem("rur_last_edit_ts");
        }
        return;
      } else {
        // Sesión expirada por inactividad — limpiar y quedar en main
        sessionStorage.removeItem("rur_last_edit_id");
        sessionStorage.removeItem("rur_last_edit_ts");
      }
    }

    // Prioridad 2: estaba en otra sección → navegar ahí
    // Solo si el ítem del sidebar es accesible para el usuario actual (no está oculto).
    // Esto evita que un admin que dejó la sesión en "umbral-lider" restaure esa vista
    // para un usuario sin permisos de administración que inicia sesión a continuación.
    if (lastView && lastView !== "main") {
      const sidebarItem = document.querySelector(`.sidebar-item[data-view="${lastView}"]`);
      if (sidebarItem && !sidebarItem.classList.contains("hidden")) sidebarItem.click();
    }
    // Si no hay estado guardado o era "main", ya está en mainSection por defecto
  }

  async function initMainView() {
    // Cargar campos del rol de sesión
    const res = await fetch(`/api/campos/${encodeURIComponent(sessionRol)}`);
    currentFields = await res.json();

    // Descripción del rol y permisos en la vista principal
    const rolMeta = ROL_META[sessionRol] || { label: sessionRol };
    const permBadges = sessionPermisos
      .map(p => {
        const m = ROL_META[p] || { label: p, bg: "#eee", color: "#333" };
        return `<span class="role-section-badge" style="background:${escapeHtml(m.bg)};color:${escapeHtml(m.color)}">${escapeHtml(m.label)}</span>`;
      })
      .join(" ");
    $("main-role-desc").innerHTML =
      `Rol activo: <span class="role-section-badge" style="background:${(ROL_META[sessionRol]||{}).bg||'#eee'};color:${(ROL_META[sessionRol]||{}).color||'#333'}">${rolMeta.label}</span>`
      + (permBadges ? `&nbsp;&nbsp;Permisos: ${permBadges}` : "");

    // Botón "Nuevo Registro" solo visible para GESTOR 1
    const canCreate = sessionPermisos.includes("GESTOR 1");
    $("btn-new-record").style.display = canCreate ? "" : "none";

    showSection(mainSection);
    await Promise.all([loadMainRecords(), loadCampoRules()]);
    await _restoreLastNavState();
  }

  // ---------------------------------------------------------------
  // MAIN VIEW: Cargar y renderizar lista de registros por secciones
  // ---------------------------------------------------------------
  // ── Paginación B1 — helpers ───────────────────────────────────────────────

  function _filtrosParams() {
    const p = new URLSearchParams();
    const q = mainSearch.value.trim();
    if (q)                  p.set("busqueda", q);
    if (activeGestorFilter) p.set("f_gestor", activeGestorFilter);
    if (activeRegionFilter) p.set("f_region", activeRegionFilter);
    if (activeLiderFilter)  p.set("f_lider",  activeLiderFilter);
    return p;
  }

  function _buildPaginacion(data, onPageChange) {
    const div = document.createElement("div");
    div.className = "paginacion-controles";
    const btnPrev = document.createElement("button");
    btnPrev.className = "pag-btn";
    btnPrev.textContent = "‹ Anterior";
    btnPrev.disabled = data.page <= 1;
    btnPrev.addEventListener("click", () => onPageChange(data.page - 1));
    const info = document.createElement("span");
    info.className = "pag-info";
    info.textContent = `Página ${data.page} de ${data.pages}  (${data.total} registros)`;
    const btnNext = document.createElement("button");
    btnNext.className = "pag-btn";
    btnNext.textContent = "Siguiente ›";
    btnNext.disabled = data.page >= data.pages;
    btnNext.addEventListener("click", () => onPageChange(data.page + 1));
    div.appendChild(btnPrev);
    div.appendChild(info);
    div.appendChild(btnNext);
    return div;
  }

  async function _fetchPaginada(seccion, grupo, page, busqueda) {
    const p = _filtrosParams();
    if (busqueda) p.set("busqueda", busqueda);
    p.set("seccion",  seccion);
    p.set("grupo",    grupo  || "");
    p.set("page",     page);
    p.set("per_page", 20);
    return fetch(`/api/registros/lista-paginada?${p}`).then(r => r.json());
  }

  async function _cargarEnContenido(contenido, seccion, grupo, busqueda, page, onLoad) {
    contenido.innerHTML = '<p class="loading-msg">Cargando…</p>';
    try {
      const data = await _fetchPaginada(seccion, grupo, page, busqueda);
      allMainRecords = data.registros;
      if (onLoad) onLoad(data.total);
      contenido.innerHTML = "";
      if (!data.registros.length) return;
      contenido.appendChild(buildRecordsTable(data.registros));
      if (data.pages > 1) {
        contenido.appendChild(_buildPaginacion(data, (newPage) => {
          _cargarEnContenido(contenido, seccion, grupo, busqueda, newPage);
        }));
      }
    } catch (e) {
      contenido.innerHTML = '<p class="loading-msg">Error al cargar registros.</p>';
      if (onLoad) onLoad(0);
    }
  }

  function getFilteredRecords() { return allMainRecords; }

  async function _cargarFiltrosDisponibles() {
    try {
      const data = await fetch("/api/registros/filtros-disponibles").then(r => r.json());
      const curReg = filterRegion.value;
      const curGes = filterGestor.value;
      const curLid = filterLider.value;
      filterRegion.innerHTML = '<option value="">— Todas las regiones —</option>';
      (data.regiones || []).forEach(reg => {
        const opt = document.createElement("option");
        opt.value = reg; opt.textContent = reg;
        filterRegion.appendChild(opt);
      });
      filterRegion.value = curReg;
      filterGestor.innerHTML = '<option value="">— Todos los gestores —</option>';
      (data.gestores || []).forEach(nom => {
        const opt = document.createElement("option");
        opt.value = nom; opt.textContent = nom;
        filterGestor.appendChild(opt);
      });
      filterGestor.value = curGes;
      filterLider.innerHTML = '<option value="">— Todos los líderes —</option>';
      (data.lideres || []).forEach(([usr, nombre]) => {
        const opt = document.createElement("option");
        opt.value = usr; opt.textContent = nombre;
        filterLider.appendChild(opt);
      });
      filterLider.value = curLid;
    } catch (_) { /* no-op */ }
  }

  function buildContralodFilters(_unused) { _cargarFiltrosDisponibles(); }

  async function _recargarTodo() {
    const p = _filtrosParams();
    let resumen;
    try {
      resumen = await fetch(`/api/registros/grupos-resumen?${p}`).then(r => r.json());
    } catch (_) {
      mainSections.innerHTML = "";
      mainEmpty.classList.remove("hidden");
      mainCount.textContent = "";
      return;
    }
    _resumenSecciones = resumen.secciones || {};
    _lastResumen      = resumen;

    const isLCA         = sessionPermisos.includes("LIDER") || sessionPermisos.includes("CONTRALOR") || sessionIsAdmin;
    const isContralor   = sessionPermisos.includes("CONTRALOR");
    const isAdminOnly   = sessionIsAdmin && !isContralor;
    const isLiderOrAdmin = (sessionPermisos.includes("LIDER") && !isContralor) || isAdminOnly;

    const navCreados = $("nav-creados");
    if (navCreados) navCreados.classList.toggle("hidden", !_resumenSecciones.creados);
    const navCerrados = $("nav-cerrados");
    if (navCerrados) navCerrados.classList.toggle("hidden", !_resumenSecciones.cerrados);
    const navPendN = $("nav-pendientes-n");
    if (navPendN) navPendN.classList.toggle("hidden", !_resumenSecciones.pendientes_n);
    const badgePendN = $("pendientes-n-badge");
    if (badgePendN) { badgePendN.textContent = _resumenSecciones.pendientes_n || ""; badgePendN.classList.toggle("hidden", !_resumenSecciones.pendientes_n); }
    const navOtra = $("nav-pendientes-otra-regional");
    if (navOtra) navOtra.classList.toggle("hidden", !_resumenSecciones.otra_regional);
    const badgeOtra = $("pendientes-otra-regional-badge");
    if (badgeOtra) { badgeOtra.textContent = _resumenSecciones.otra_regional || ""; badgeOtra.classList.toggle("hidden", !_resumenSecciones.otra_regional); }
    const navRechN = $("nav-rechazados-n");
    if (navRechN) navRechN.classList.toggle("hidden", !_resumenSecciones.rechazados_n || !_canSeeRechazadosN());
    const navPV = $("nav-pendientes-validar");
    if (navPV) navPV.classList.toggle("hidden", !isLCA || !_resumenSecciones.pendientes_validar);
    const badgePV = $("pendientes-validar-badge");
    if (badgePV) { badgePV.textContent = _resumenSecciones.pendientes_validar || ""; badgePV.classList.toggle("hidden", !_resumenSecciones.pendientes_validar); }

    // Registros en Revisión de Contralor: solo LIDER y ADMIN (no CONTRALOR), solo si hay registros
    const navEnRevision = $("nav-en-revision-contralor");
    if (navEnRevision) navEnRevision.classList.toggle("hidden", !isLiderOrAdmin || !_resumenSecciones.en_revision_contralor);
    const badgeEnRevision = $("en-revision-contralor-badge");
    if (badgeEnRevision) { badgeEnRevision.textContent = _resumenSecciones.en_revision_contralor || ""; badgeEnRevision.classList.toggle("hidden", !_resumenSecciones.en_revision_contralor); }

    // Registros en Curso (para CONTRALOR): solo CONTRALOR, solo si hay registros
    const navEnCurso = $("nav-en-curso-contralor");
    if (navEnCurso) navEnCurso.classList.toggle("hidden", !isContralor || !_resumenSecciones.en_curso_contralor);
    const badgeEnCurso = $("en-curso-contralor-badge");
    if (badgeEnCurso) { badgeEnCurso.textContent = _resumenSecciones.en_curso_contralor || ""; badgeEnCurso.classList.toggle("hidden", !_resumenSecciones.en_curso_contralor); }

    await renderSections(resumen);
  }

  async function loadMainRecords() {
    mainSearch.value   = "";
    activeGestorFilter = "";
    activeRegionFilter = "";
    activeLiderFilter  = "";
    filterGestor.value = "";
    filterRegion.value = "";
    filterLider.value  = "";

    const isLiderCoord = sessionPermisos.includes("LIDER") || sessionPermisos.includes("COORDINADOR");
    const isCtrlAdmin  = sessionRol === "CONTRALOR" || sessionIsAdmin;

    if (isCtrlAdmin) {
      mainFilters.classList.remove("hidden");
      filterGestor.classList.remove("hidden");
      filterRegion.classList.remove("hidden");
      filterLider.classList.remove("hidden");
      _cargarFiltrosDisponibles();
    } else if (isLiderCoord) {
      mainFilters.classList.remove("hidden");
      filterRegion.classList.add("hidden");
      filterLider.classList.add("hidden");
      filterGestor.classList.remove("hidden");
      const gestores = await fetch("/api/mis-gestores").then(r => r.json());
      filterGestor.innerHTML = '<option value="">— Todos los gestores —</option>';
      gestores.forEach(g => {
        const opt = document.createElement("option");
        opt.value = g.nombre; opt.textContent = g.nombre;
        filterGestor.appendChild(opt);
      });
      if (!gestores.length) mainFilters.classList.add("hidden");
    } else {
      mainFilters.classList.add("hidden");
    }

    await _recargarTodo();
  }

  // Genera el HTML de una tabla de registros
  function buildRecordsTable(records) {
    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    const table = document.createElement("table");
    table.className = "records-table";
    table.innerHTML = `<thead><tr>
      <th>Consecutivo</th><th>Compañía</th><th>NIT Prestador</th>
      <th>Nombre Prestador</th><th>VR Cartera</th><th>Periodo Desde</th>
      <th>Periodo Hasta</th><th>Creado por</th><th>Fecha</th><th></th>
    </tr></thead>`;
    const tbody = document.createElement("tbody");
    for (const rec of records) {
      const canEdit = rec.can_edit !== false;
      const tr = document.createElement("tr");
      if (rec.tiene_auditoria_activa) {
        tr.style.cssText = "background:rgba(251,191,36,0.15);border-left:3px solid #F59E0B";
        tr.title = "Tiene auditoría activa";
      }
      const vrCartHtml = rec.vr_cartera != null && rec.vr_cartera !== ""
        ? `<span style="flex:0 0 auto">$</span><span style="flex:1;text-align:right">${Number(rec.vr_cartera).toLocaleString("en-US")}</span>`
        : `<span>—</span>`;
      tr.innerHTML = `
        <td>${escapeHtml(rec.consecutivo || "—")}</td>
        <td>${escapeHtml(rec.compania || "—")}</td>
        <td>${escapeHtml(rec.nit || "—")}</td>
        <td>${escapeHtml(rec.nombre || "—")}</td>
        <td><div style="display:flex;gap:.4rem;white-space:nowrap;min-width:110px">${vrCartHtml}</div></td>
        <td>${escapeHtml(rec.periodo_desde || "—")}</td>
        <td>${escapeHtml(rec.periodo_hasta || "—")}</td>
        <td>${escapeHtml(rec.nombre_creador || rec.usuario || "")}</td>
        <td>${formatDate(rec.fecha_creacion)}</td>
        <td></td>`;
      const btn = document.createElement("button");
      btn.className = canEdit ? "btn-edit-record" : "btn-view-record";
      btn.textContent = canEdit ? "Editar" : "Ver";
      btn.title = canEdit ? "Editar registro" : `Solo lectura — ciudad responsable: ${escapeHtml(rec.ciudad_resp || "no asignada")}`;
      btn.addEventListener("click", () => openEditForm(rec.id, rec));
      tr.lastElementChild.appendChild(btn);
      if (sessionIsAdmin) {
        const btnAud = document.createElement("button");
        btnAud.className = "btn-audit-record";
        btnAud.textContent = "Auditoría";
        btnAud.addEventListener("click", (e) => { e.stopPropagation(); openAuditoriaModal(rec.id, rec); });
        tr.lastElementChild.appendChild(btnAud);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  function renderSection(container, title, records, colorClass) {
    const details = document.createElement("details");
    details.className = `records-section${colorClass ? " " + colorClass : ""}`;
    details.open = true;
    const summary = document.createElement("summary");
    summary.className = "records-section-header";
    summary.innerHTML = `
      <span class="records-section-chevron">▶</span>
      <h3>${escapeHtml(title)}</h3>
      <span class="section-count-badge">${records.length} registro${records.length !== 1 ? "s" : ""}</span>`;
    details.appendChild(summary);
    details.appendChild(buildRecordsTable(records));
    container.appendChild(details);
  }

  function renderSectionPaginada(container, title, total, colorClass) {
    const details = document.createElement("details");
    details.className = `records-section${colorClass ? " " + colorClass : ""}`;
    details.open = true;
    const summary = document.createElement("summary");
    summary.className = "records-section-header";
    summary.innerHTML = `
      <span class="records-section-chevron">▶</span>
      <h3>${escapeHtml(title)}</h3>
      <span class="section-count-badge">${total} registro${total !== 1 ? "s" : ""}</span>`;
    details.appendChild(summary);
    const contenido = document.createElement("div");
    details.appendChild(contenido);
    container.appendChild(details);
    return contenido;
  }

  async function renderSections(resumen) {
    mainSections.innerHTML = "";
    const isCtrlAdmin = sessionRol === "CONTRALOR" || sessionIsAdmin;
    const isLider     = sessionPermisos.includes("LIDER");
    const grupos      = (resumen && resumen.grupos_main) ? resumen.grupos_main : [];

    // Cuando hay búsqueda activa, incluir también los registros "Pendientes de validar"
    // para que el buscador global encuentre registros en todas las secciones.
    const hayBusqueda = mainSearch.value.trim().length > 0;
    const gruposPV    = (hayBusqueda && resumen && resumen.grupos_pend_validar)
                          ? resumen.grupos_pend_validar : [];

    const totalAll = grupos.reduce((s, g) => s + g.total, 0)
                   + gruposPV.reduce((s, g) => s + g.total, 0);

    if (!grupos.length && !gruposPV.length) {
      mainEmpty.classList.remove("hidden");
      mainCount.textContent = "";
      return;
    }
    mainEmpty.classList.add("hidden");
    mainCount.textContent = `${totalAll} registro${totalAll !== 1 ? "s" : ""}`;

    for (const grupo of grupos) {
      const colorClass = isCtrlAdmin ? "section-region" : isLider ? "section-ciudad" : "section-asignado";
      const label      = isCtrlAdmin ? grupo.label : isLider ? `Responsable: ${grupo.label}` : grupo.label;
      const contenido  = renderSectionPaginada(mainSections, label, grupo.total, colorClass);
      await _cargarEnContenido(contenido, "main", grupo.clave, "", 1);
    }

    // Renderizar pendientes de validar cuando hay búsqueda activa
    for (const grupo of gruposPV) {
      const colorClass = isCtrlAdmin ? "section-region" : "section-asignado";
      const label      = isCtrlAdmin
                           ? `Pendiente de validar — ${grupo.label || "Sin regional"}`
                           : `Pendiente de validar — ${grupo.label || "Sin responsable"}`;
      const contenido  = renderSectionPaginada(mainSections, label, grupo.total, colorClass);
      await _cargarEnContenido(contenido, "pendientes_validar", grupo.clave, "", 1);
    }
  }

  // Valores de CE que representan un registro cerrado
  const _CE_CIERRE_VALS_CERRADOS = new Set(["CERRADO POR CANCELACION DE MESAS", "CERRADO SIN FINALIZACIÓN"]);

  // Valores de AC que representan un registro cerrado (deben coincidir con _AC_CIERRE_VALS_LOCK)
  const _AC_CIERRE_VALS_CERRADOS = new Set([
    "CERRADO POR CANCELACION DE MESA",
    "CERRADO POR CANCELACION DE MESAS",
    "CERRADO SIN FINALIZACIÓN",
    "IPS NO ASISTE A MESAS",
  ]);
  function _isCerrado(r) {
    return _AC_CIERRE_VALS_CERRADOS.has((r.estado_ac || "").trim()) ||
           (r.estado_bd || "").trim() === "CERRADO SIN FINALIZACION" ||
           _CE_CIERRE_VALS_CERRADOS.has((r.estado_ce || "").trim());
  }

  // Registro enviado a controlar: solo visible para CONTRALOR/ADMIN
  function _isByEnviada(r) {
    return (r.estado_by || "").trim() === _BY_ENVIADA_VAL;
  }

  // ── Estado de aprobación de Fecha N ──────────────────────────────────────
  const _N_MAX_DIAS = 14;

  function _estadoN(r) { return (r.estado_aprobacion_n || "").trim(); }
  function _isPendienteN(r) { return _estadoN(r) === "pendiente"; }
  function _isRechazadoN(r) { return _estadoN(r) === "rechazado"; }
  function _isCanceladoN(r) { return _estadoN(r) === "cancelado"; }
  function _isOtraRegionalPendiente(r) { return r.pendiente_otra_regional === true; }
  function _needsSeparateSection(r) {
    return _isPendienteN(r) || _isRechazadoN(r) || _isCanceladoN(r) || _isOtraRegionalPendiente(r);
  }

  function _nEsAntigua(fechaStr) {
    if (!fechaStr) return false;
    try {
      const d = new Date(fechaStr);
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const diff = Math.floor((hoy - d) / 86400000);
      return diff > _N_MAX_DIAS;
    } catch (e) { return false; }
  }

  // Modal genérico de comentario (Promise → texto o null si cancelado)
  function _pedirComentarioN(overlayId, inputId, errorId, confirmId, cancelId) {
    return new Promise(resolve => {
      const overlay  = document.getElementById(overlayId);
      const textarea = document.getElementById(inputId);
      const errorEl  = document.getElementById(errorId);
      const btnOk    = document.getElementById(confirmId);
      const btnCancel = document.getElementById(cancelId);
      if (!overlay) { resolve(null); return; }
      textarea.value = "";
      if (errorEl) errorEl.style.display = "none";
      overlay.classList.remove("hidden");
      const cleanup = () => overlay.classList.add("hidden");
      btnOk.onclick = () => {
        const v = textarea.value.trim();
        if (!v) { if (errorEl) errorEl.style.display = "block"; return; }
        cleanup();
        resolve(v);
      };
      btnCancel.onclick = () => { cleanup(); resolve(null); };
    });
  }

  function _pedirComentarioSolicitudN() {
    return _pedirComentarioN(
      "solicitud-n-overlay", "solicitud-n-input", "solicitud-n-error",
      "btn-solicitud-n-confirmar", "btn-solicitud-n-cancelar"
    );
  }
  function _pedirComentarioRechazoN() {
    return _pedirComentarioN(
      "rechazo-n-overlay", "rechazo-n-input", "rechazo-n-error",
      "btn-rechazo-n-confirmar", "btn-rechazo-n-cancelar"
    );
  }
  function _pedirComentarioReactivarN() {
    return _pedirComentarioN(
      "reactivar-n-overlay", "reactivar-n-input", "reactivar-n-error",
      "btn-reactivar-n-confirmar", "btn-reactivar-n-cancelar"
    );
  }

  function _canSeePendientesN() { return true; }
  function _canSeeRechazadosN() {
    if (sessionIsAdmin || sessionPermisos.includes("CONTRALOR") || sessionPermisos.includes("LIDER")) return true;
    return (_resumenSecciones.rechazados_n || 0) > 0;
  }

  async function renderCreadosSection() {
    const q    = ($("creados-search") || {}).value || "";
    const cont = $("creados-sections");
    const emp  = $("creados-empty");
    const cnt  = $("creados-count");
    if (!cont) return;
    cont.innerHTML = "";
    if (emp) emp.classList.add("hidden");
    const contenido = renderSectionPaginada(cont, "Registros creados por mí", "…", "section-creado");
    await _cargarEnContenido(contenido, "creados", "", q.trim(), 1, (total) => {
      if (!total) { cont.innerHTML = ""; if (emp) emp.classList.remove("hidden"); if (cnt) cnt.textContent = ""; }
      else { if (cnt) cnt.textContent = `${total} registro${total !== 1 ? "s" : ""}`; }
    });
  }

  async function renderCerradosSection() {
    const q    = ($("cerrados-search") || {}).value || "";
    const cont = $("cerrados-sections");
    const emp  = $("cerrados-empty");
    const cnt  = $("cerrados-count");
    if (!cont) return;
    cont.innerHTML = "";
    if (emp) emp.classList.add("hidden");

    const isCtrlAdmin = sessionRol === "CONTRALOR" || sessionIsAdmin;
    const isLider     = sessionPermisos.includes("LIDER");
    const resumen     = _lastResumen || {};
    const grupos      = resumen.grupos_cerrados || [];

    if ((isCtrlAdmin || isLider) && grupos.length) {
      const totalAll = grupos.reduce((s, g) => s + g.total, 0);
      if (cnt) cnt.textContent = `${totalAll} registro${totalAll !== 1 ? "s" : ""}`;
      for (const grupo of grupos) {
        const colorClass = isCtrlAdmin ? "section-region" : "section-ciudad";
        const label      = isCtrlAdmin ? grupo.label : `Responsable: ${grupo.label}`;
        const contenido  = renderSectionPaginada(cont, label, grupo.total, colorClass);
        await _cargarEnContenido(contenido, "cerrados", grupo.clave, q.trim(), 1);
      }
    } else {
      const contenido = renderSectionPaginada(cont, "Registros cerrados sin finalización", "…", "section-cerrado");
      await _cargarEnContenido(contenido, "cerrados", "", q.trim(), 1, (total) => {
        if (!total) { cont.innerHTML = ""; if (emp) emp.classList.remove("hidden"); if (cnt) cnt.textContent = ""; }
        else { if (cnt) cnt.textContent = `${total} registro${total !== 1 ? "s" : ""}`; }
      });
    }
  }

  async function renderFinalizadosSection() {
    const q    = ($("finalizados-search") || {}).value || "";
    const cont = $("finalizados-sections");
    const emp  = $("finalizados-empty");
    const cnt  = $("finalizados-count");
    if (!cont) return;
    cont.innerHTML = "";
    if (emp) emp.classList.add("hidden");
    const contenido = renderSectionPaginada(cont, "Registros Finalizados", "…", "section-finalizado");
    await _cargarEnContenido(contenido, "finalizados", "", q.trim(), 1, (total) => {
      if (!total) { cont.innerHTML = ""; if (emp) emp.classList.remove("hidden"); if (cnt) cnt.textContent = ""; }
      else { if (cnt) cnt.textContent = `${total} registro${total !== 1 ? "s" : ""}`; }
    });
  }

  async function renderEnRevisionContralorSection() {
    const q    = ($("en-revision-contralor-search") || {}).value || "";
    const cont = $("en-revision-contralor-sections");
    const emp  = $("en-revision-contralor-empty");
    const cnt  = $("en-revision-contralor-count");
    if (!cont) return;
    cont.innerHTML = "";
    if (emp) emp.classList.add("hidden");

    const isLider      = sessionPermisos.includes("LIDER");
    const isAdminOnly  = sessionIsAdmin && !sessionPermisos.includes("CONTRALOR");
    const resumen      = _lastResumen || {};
    const grupos       = resumen.grupos_en_revision || [];

    if (grupos.length) {
      const totalAll = grupos.reduce((s, g) => s + g.total, 0);
      if (cnt) cnt.textContent = `${totalAll} registro${totalAll !== 1 ? "s" : ""}`;
      for (const grupo of grupos) {
        const colorClass = isAdminOnly ? "section-region" : "section-ciudad";
        const label      = isLider ? `Responsable: ${grupo.label}` : grupo.label;
        const contenido  = renderSectionPaginada(cont, label, grupo.total, colorClass);
        await _cargarEnContenido(contenido, "en_revision_contralor", grupo.clave, q.trim(), 1);
      }
    } else {
      const contenido = renderSectionPaginada(cont, "Registros en Revisión de Contralor", "…", "section-region");
      await _cargarEnContenido(contenido, "en_revision_contralor", "", q.trim(), 1, (total) => {
        if (!total) { cont.innerHTML = ""; if (emp) emp.classList.remove("hidden"); if (cnt) cnt.textContent = ""; }
        else { if (cnt) cnt.textContent = `${total} registro${total !== 1 ? "s" : ""}`; }
      });
    }
  }

  async function renderEnCursoContralorSection() {
    const q    = ($("en-curso-contralor-search") || {}).value || "";
    const cont = $("en-curso-contralor-sections");
    const emp  = $("en-curso-contralor-empty");
    const cnt  = $("en-curso-contralor-count");
    if (!cont) return;
    cont.innerHTML = "";
    if (emp) emp.classList.add("hidden");

    const resumen = _lastResumen || {};
    const grupos  = resumen.grupos_en_curso_contralor || [];

    if (grupos.length) {
      const totalAll = grupos.reduce((s, g) => s + g.total, 0);
      if (cnt) cnt.textContent = `${totalAll} registro${totalAll !== 1 ? "s" : ""}`;
      for (const grupo of grupos) {
        const contenido = renderSectionPaginada(cont, grupo.label || "Sin ciudad responsable", grupo.total, "section-region");
        await _cargarEnContenido(contenido, "en_curso_contralor", grupo.clave, q.trim(), 1);
      }
    } else {
      const contenido = renderSectionPaginada(cont, "Registros en Curso", "…", "section-region");
      await _cargarEnContenido(contenido, "en_curso_contralor", "", q.trim(), 1, (total) => {
        if (!total) { cont.innerHTML = ""; if (emp) emp.classList.remove("hidden"); if (cnt) cnt.textContent = ""; }
        else { if (cnt) cnt.textContent = `${total} registro${total !== 1 ? "s" : ""}`; }
      });
    }
  }

  async function renderPendientesNSection() {
    const q    = ($("pendientes-n-search") || {}).value || "";
    const cont = $("pendientes-n-sections");
    const emp  = $("pendientes-n-empty");
    const cnt  = $("pendientes-n-count");
    if (!cont) return;
    cont.innerHTML = "";
    if (emp) emp.classList.add("hidden");
    const contenido = renderSectionPaginada(cont, "Pendientes de aprobación — Fecha de Solicitud", "…", "section-pendiente-n");
    await _cargarEnContenido(contenido, "pendientes_n", "", q.trim(), 1, (total) => {
      if (!total) { cont.innerHTML = ""; if (emp) emp.classList.remove("hidden"); if (cnt) cnt.textContent = ""; }
      else { if (cnt) cnt.textContent = `${total} registro${total !== 1 ? "s" : ""}`; }
    });
  }

  async function renderRechazadosNSection() {
    const q    = ($("rechazados-n-search") || {}).value || "";
    const cont = $("rechazados-n-sections");
    const emp  = $("rechazados-n-empty");
    const cnt  = $("rechazados-n-count");
    if (!cont) return;
    cont.innerHTML = "";
    if (emp) emp.classList.add("hidden");
    const contenido = renderSectionPaginada(cont, "Rechazados por Fecha de Solicitud [N]", "…", "section-rechazado-n");
    await _cargarEnContenido(contenido, "rechazados_n", "", q.trim(), 1, (total) => {
      if (!total) { cont.innerHTML = ""; if (emp) emp.classList.remove("hidden"); if (cnt) cnt.textContent = ""; }
      else { if (cnt) cnt.textContent = `${total} registro${total !== 1 ? "s" : ""}`; }
    });
  }

  async function renderOtraRegionalSection() {
    const q    = ($("pendientes-otra-regional-search") || {}).value || "";
    const cont = $("pendientes-otra-regional-sections");
    const emp  = $("pendientes-otra-regional-empty");
    const cnt  = $("pendientes-otra-regional-count");
    if (!cont) return;
    cont.innerHTML = "";
    if (emp) emp.classList.add("hidden");
    const contenido = renderSectionPaginada(cont, "Pendiente de aprobación — otra regional (solo lectura)", "…", "section-pendiente-otra-regional");
    await _cargarEnContenido(contenido, "otra_regional", "", q.trim(), 1, (total) => {
      if (!total) { cont.innerHTML = ""; if (emp) emp.classList.remove("hidden"); if (cnt) cnt.textContent = ""; }
      else { if (cnt) cnt.textContent = `${total} registro${total !== 1 ? "s" : ""}`; }
    });
  }

  function getPendientesValidarFiltered() { return allMainRecords; }

  async function renderPendientesValidarSection() {
    const cont = $("pendientes-validar-sections");
    const emp  = $("pendientes-validar-empty");
    const cnt  = $("pendientes-validar-count");
    if (!cont) return;
    cont.innerHTML = "";
    if (emp) emp.classList.add("hidden");

    const isCtrlAdmin = sessionRol === "CONTRALOR" || sessionIsAdmin;
    const isLider     = sessionPermisos.includes("LIDER");
    const resumen     = _lastResumen || {};
    const grupos      = (resumen.grupos_pend_validar || []);

    if (grupos.length) {
      let totalAll = grupos.reduce((s, g) => s + g.total, 0);
      if (cnt) cnt.textContent = `${totalAll} registro${totalAll !== 1 ? "s" : ""}`;
      for (const grupo of grupos) {
        const colorClass = isCtrlAdmin ? "section-region" : "section-asignado";
        const label      = isCtrlAdmin ? grupo.label : `Responsable: ${grupo.label}`;
        const contenido  = renderSectionPaginada(cont, label, grupo.total, colorClass);
        await _cargarEnContenido(contenido, "pendientes_validar", grupo.clave, "", 1);
      }
    } else {
      const contenido = renderSectionPaginada(cont, "Pendientes de validar", "…", "section-asignado");
      await _cargarEnContenido(contenido, "pendientes_validar", "", "", 1, (total) => {
        if (!total) { cont.innerHTML = ""; if (emp) emp.classList.remove("hidden"); if (cnt) cnt.textContent = ""; }
        else { if (cnt) cnt.textContent = `${total} registro${total !== 1 ? "s" : ""}`; }
      });
    }
  }

  async function _renderAllSections() {
    await _recargarTodo();
    const view = sessionStorage.getItem("rur_last_view") || "main";
    if      (view === "creados")                     await renderCreadosSection();
    else if (view === "cerrados")                    await renderCerradosSection();
    else if (view === "pendientes-n")                await renderPendientesNSection();
    else if (view === "rechazados-n")                await renderRechazadosNSection();
    else if (view === "pendientes-otra-regional")    await renderOtraRegionalSection();
    else if (view === "pendientes-validar")          await renderPendientesValidarSection();
    else if (view === "mis-auditorias")              await renderMisAuditoriasSection();
    else if (view === "finalizados")                 await renderFinalizadosSection();
    else if (view === "en-revision-contralor")       await renderEnRevisionContralorSection();
    else if (view === "en-curso-contralor")          await renderEnCursoContralorSection();
  }

  // Filtros: cambio en cualquier selector o buscador
  mainSearch.addEventListener("input", () => {
    clearTimeout(_searchDebounceTimer);
    _searchDebounceTimer = setTimeout(_renderAllSections, 400);
  });
  filterGestor.addEventListener("change", () => { activeGestorFilter = filterGestor.value; _renderAllSections(); });
  filterRegion.addEventListener("change", () => { activeRegionFilter = filterRegion.value;  _renderAllSections(); });
  filterLider.addEventListener("change",  () => { activeLiderFilter  = filterLider.value;   _renderAllSections(); });

  $("creados-search").addEventListener("input", () => { clearTimeout(_searchDebounceTimer); _searchDebounceTimer = setTimeout(renderCreadosSection, 400); });
  $("btn-creados-back").addEventListener("click", () => { showSection(mainSection); currentEditId = null; });
  $("cerrados-search").addEventListener("input", () => { clearTimeout(_searchDebounceTimer); _searchDebounceTimer = setTimeout(renderCerradosSection, 400); });
  $("btn-cerrados-back").addEventListener("click", () => { showSection(mainSection); currentEditId = null; });
  $("btn-mis-auditorias-back").addEventListener("click", () => { showSection(mainSection); currentEditId = null; });
  $("pendientes-n-search").addEventListener("input", () => { clearTimeout(_searchDebounceTimer); _searchDebounceTimer = setTimeout(renderPendientesNSection, 400); });
  $("btn-pendientes-n-back").addEventListener("click", () => { showSection(mainSection); currentEditId = null; });
  $("rechazados-n-search").addEventListener("input", () => { clearTimeout(_searchDebounceTimer); _searchDebounceTimer = setTimeout(renderRechazadosNSection, 400); });
  $("pendientes-otra-regional-search").addEventListener("input", () => { clearTimeout(_searchDebounceTimer); _searchDebounceTimer = setTimeout(renderOtraRegionalSection, 400); });
  $("btn-pendientes-otra-regional-back").addEventListener("click", () => { showSection(mainSection); currentEditId = null; });
  $("btn-rechazados-n-back").addEventListener("click", () => { showSection(mainSection); currentEditId = null; });
  const _pvSearch = $("pendientes-validar-search");
  if (_pvSearch) _pvSearch.addEventListener("input", () => { clearTimeout(_searchDebounceTimer); _searchDebounceTimer = setTimeout(renderPendientesValidarSection, 400); });
  const _pvBack = $("btn-pendientes-validar-back");
  if (_pvBack) _pvBack.addEventListener("click", () => { showSection(mainSection); loadMainRecords(); currentEditId = null; });

  // Registros en Revisión de Contralor — búsqueda y botón atrás
  const _revSearch = $("en-revision-contralor-search");
  if (_revSearch) _revSearch.addEventListener("input", () => { clearTimeout(_searchDebounceTimer); _searchDebounceTimer = setTimeout(renderEnRevisionContralorSection, 400); });
  const _revBack = $("btn-en-revision-contralor-back");
  if (_revBack) _revBack.addEventListener("click", () => { showSection(mainSection); loadMainRecords(); currentEditId = null; });

  // Registros en Curso (Contralor) — búsqueda y botón atrás
  const _cursoSearch = $("en-curso-contralor-search");
  if (_cursoSearch) _cursoSearch.addEventListener("input", () => { clearTimeout(_searchDebounceTimer); _searchDebounceTimer = setTimeout(renderEnCursoContralorSection, 400); });
  const _cursoBack = $("btn-en-curso-contralor-back");
  if (_cursoBack) _cursoBack.addEventListener("click", () => { showSection(mainSection); loadMainRecords(); currentEditId = null; });

  // Registros Finalizados — búsqueda y botones
  const _finSearch = $("finalizados-search");
  if (_finSearch) _finSearch.addEventListener("input", () => { clearTimeout(_searchDebounceTimer); _searchDebounceTimer = setTimeout(renderFinalizadosSection, 400); });
  const _finBack = $("btn-finalizados-back");
  if (_finBack) _finBack.addEventListener("click", () => { showSection(mainSection); loadMainRecords(); currentEditId = null; });
  const _finExport = $("btn-export-finalizados");
  if (_finExport) _finExport.addEventListener("click", () => {
    const visible = allMainRecords;
    if (!visible.length) { showToast("No hay registros finalizados para exportar.", "warning"); return; }
    const ids = visible.map(r => r.id).join(",");
    window.location.href = `${BASE}/api/registros/exportar/${encodeURIComponent(sessionRol)}?ids=${ids}`;
  });

  // ---------------------------------------------------------------
  // MAIN VIEW: Botones de acción
  // ---------------------------------------------------------------
  $("btn-new-record").addEventListener("click", openCreateForm);

  $("btn-export-main").addEventListener("click", () => {
    const filtered = getFilteredRecords();
    // Aplicar la misma lógica de sección que renderSections para exportar
    // exactamente lo que el usuario ve en pantalla
    const isCtrlAdmin   = sessionRol === "CONTRALOR" || sessionIsAdmin;
    const isLiderCoord  = sessionPermisos.includes("LIDER") || sessionPermisos.includes("COORDINADOR");
    let visible;
    if (isCtrlAdmin) {
      visible = filtered;
    } else if (isLiderCoord) {
      visible = filtered.filter(r => r.section === "asignado" || r.section === "ciudad");
    } else {
      visible = filtered.filter(r => r.section === "asignado");
    }
    if (!visible.length) { showToast("No hay registros visibles para exportar.", "warning"); return; }
    const ids = visible.map(r => r.id).join(",");
    window.location.href = `${BASE}/api/registros/exportar/${encodeURIComponent(sessionRol)}?ids=${ids}`;
  });

  // ---------------------------------------------------------------
  // MAIN VIEW: Eliminar registro (solo GESTOR 1)
  // ---------------------------------------------------------------
  async function deleteRecord(id, consecutivo) {
    const label = consecutivo ? `"${consecutivo}"` : `#${id}`;
    if (!confirm(`¿Eliminar el registro ${label}?\n\nEsta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/registro/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Error al eliminar el registro", "error");
      return;
    }
    showToast("Registro eliminado exitosamente", "success");
    await loadMainRecords();
  }

  // ---------------------------------------------------------------
  // FORM: Abrir para crear nuevo registro
  // ---------------------------------------------------------------
  async function openCreateForm() {
    currentEditId = null;
    sessionStorage.removeItem("rur_last_edit_id");
    _originalCampos = {};
    _reaperturaLiderCount = 0;
    formTitle.textContent = "Nuevo Registro";
    editBanner.classList.add("hidden");
    btnSubmit.textContent = "Guardar Registro";
    btnSubmit.classList.remove("hidden");
    if (btnReabrir) btnReabrir.classList.add("hidden");
    btnRestoreAll.classList.add("hidden");
    if (btnPartirGlosa) btnPartirGlosa.classList.add("hidden");
    // Nuevo registro: nunca mostrar botones de aprobación N
    [btnAprobarN, btnRechazarN, btnCancelarN, btnReactivarN].forEach(b => b && b.classList.add("hidden"));

    // Creación: mostrar solo campos de GESTOR 1
    const resG1 = await fetch("/api/campos/GESTOR%201");
    const gestor1Fields = await resG1.json();
    renderForm(gestor1Fields);


    // Auto-fill REGIONAL IPS (field_B) — editable, por defecto la regional del gestor
    if (sessionRegional) {
      const fieldB = document.querySelector("[name='field_B']");
      if (fieldB && !fieldB.value) fieldB.value = sessionRegional;
    }

    // Auto-fill CIUDAD RESPONSABLE DE LA CONCILIACION (field_C) — sugerido con la regional del gestor, editable
    if (sessionRegional) {
      const fieldC = document.querySelector("[name='field_C']");
      if (fieldC && !fieldC.value) fieldC.value = sessionRegional;
    }

    resetFieldSearch();
    showSection(formSection);
    attachNitValidation();
    attachFormDependencies();
    attachCurrencyInputs();
    applyFieldRules();
    attachFechaMaxHoyValidation();
    _cfcgRevealed = false;
    _setCFCGVisibility(false, false);
  }

  // ---------------------------------------------------------------
  // FORM: Abrir para editar registro existente
  // ---------------------------------------------------------------
  async function openEditForm(id, meta) {
    const res = await fetch(`/api/registro/${id}`);
    if (!res.ok) { showToast("Error al cargar el registro.", "error"); return; }
    const data = await res.json();
    currentEditId = id;
    sessionStorage.setItem("rur_last_edit_id", String(id));
    sessionStorage.setItem("rur_last_edit_ts", String(Date.now()));
    _originalCampos  = JSON.parse(JSON.stringify(data.campos || {}));
    _pendingValidar  = false; // resetear siempre al abrir
    _byEnviadaLocked = false;

    const canEdit = data.can_edit !== false;
    const ciudadInfo = data.ciudad_resp ? ` · Ciudad responsable: ${data.ciudad_resp}` : "";
    const esFinalizado = !!(data.proceso_finalizado);

    if (esFinalizado) {
      formTitle.textContent = `Finalizado: ${meta.consecutivo || "#" + id} — Solo lectura`;
      editBannerText.textContent = `Registro #${id}${ciudadInfo} — Proceso finalizado (solo lectura)`;
      btnSubmit.classList.add("hidden");
      btnRestoreAll.classList.add("hidden");
    } else if (canEdit) {
      formTitle.textContent = `Editar: ${meta.consecutivo || "#" + id}`;
      editBannerText.textContent = `Editando registro #${id}: ${meta.consecutivo || ""}  ·  ${meta.nombre || ""}${ciudadInfo}`;
      btnSubmit.textContent = "Actualizar Registro";
      btnSubmit.classList.remove("hidden");
      btnRestoreAll.classList.remove("hidden");
    } else {
      formTitle.textContent = `Ver: ${meta.consecutivo || "#" + id} — Solo lectura`;
      editBannerText.textContent = `Registro #${id}${ciudadInfo} — Solo lectura (no pertenece a su ciudad responsable de conciliación)`;
      btnRestoreAll.classList.add("hidden");
      btnSubmit.classList.add("hidden");
    }
    editBanner.classList.remove("hidden");

    // Nota: el bloqueo completo de campos para registros finalizados se aplica
    // al final de openEditForm, después de que renderFormWithSections haya construido el DOM.

    const isCreatedByMe  = data.usuario === sessionUsuario;
    const responsable    = (data.campos && data.campos["AG"]) || "";
    const assignedToMe   = !responsable || responsable.toLowerCase() === (sessionNombre || "").toLowerCase();
    const isLiderCtrl    = sessionPermisos.includes("LIDER") || sessionPermisos.includes("CONTRALOR") || sessionIsAdmin;
    const validado       = data.validado       || false;
    const fechaValid     = data.fecha_validacion || null;
    const validadoPor    = data.validado_por   || null;

    // Contador de reapertura del lider para este registro (máx 1)
    _reaperturaLiderCount = Math.max(
      parseInt(data.reapertura_lider_ac || 0),
      parseInt(data.reapertura_lider_bd || 0),
      parseInt(data.reapertura_lider_ce || 0)
    );

    // CONTRALOR y ADMIN siempre pueden ver/editar todo
    const isContrAdminSess = sessionPermisos.includes("CONTRALOR") || sessionIsAdmin;

    // Casos que fuerzan vista sólo-sección-1:
    //   (A) creator no asignado: creó pero AG apunta a otro
    //   (B) gestor asignado no validado (no creador): ve sección 1 + botón Validar
    //   (C) creator auto-asignado: creó y AG = su nombre → modo validación hasta que valide
    //   (D) pendiente-N: registro congelado esperando aprobación del líder (todos excepto CONTRALOR/ADMIN)
    const creatorNotAssigned    = sessionPermisos.includes("GESTOR 1") && isCreatedByMe && !assignedToMe;
    const assignedPreValidation = !validado && assignedToMe && !isCreatedByMe && !isLiderCtrl;
    const creatorSelfAssigned   = isCreatedByMe && assignedToMe && !validado && !isLiderCtrl;
    const pendienteN            = (data.estado_aprobacion_n || "").trim() === "pendiente";

    // NUEVO: LIDER o CONTRALOR/ADMIN en un registro aún no validado → solo sección G1 read-only
    const isLiderPureRole         = sessionPermisos.includes("LIDER") && !sessionIsAdmin;
    const _liderCtrlNonValidated  = !validado && isLiderCtrl;

    const gestor1Only = (pendienteN && !isContrAdminSess) ||
                        (!isLiderCtrl && (creatorNotAssigned || assignedPreValidation || creatorSelfAssigned)) ||
                        _liderCtrlNonValidated;  // NUEVO: LIDER/CONTRALOR en no-validado

    // Editable cuando gestor1Only sólo si el registro NO está validado Y no es LIDER/CONTRALOR
    const gestor1Editable = gestor1Only && !validado && !_liderCtrlNonValidated;

    // Botón "Validar":
    //   - Gestor asignado (AG = su nombre), no validado, no lider/ctrl → el gestor valida
    //   - LIDER (no admin), no validado → el líder también puede validar
    const showValidarGestor = canEdit && !validado && !!responsable &&
                              responsable.toLowerCase() === (sessionNombre || "").toLowerCase() &&
                              !isLiderCtrl;
    const showValidarLider  = canEdit && !validado && isLiderPureRole;
    const showValidar       = showValidarGestor || showValidarLider;

    // Sección propia readonly:
    //   - GESTOR 1: bloqueada post-validación (solo líder/ctrl pueden editar sección 1 validada)
    //   - GESTOR 2 / LIDER: bloqueada pre-validación (deben esperar que el registro sea validado)
    const ownSectionReadonly = (validado && !isLiderCtrl && currentRole === "GESTOR 1") ||
                               (!validado && currentRole !== "GESTOR 1" && !isContrAdminSess);

    // El botón de submit actúa como "Validar" cuando corresponde
    if (canEdit) {
      btnSubmit.textContent = showValidar ? "✔ Validar Registro" : "Actualizar Registro";
      _pendingValidar = showValidar;
    }

    // LIDER/CONTRALOR/ADMIN en registro NO validado:
    //   - Solo muestra sección G1 en lectura
    //   - LIDER: muestra botón Validar, oculta Restaurar y Limpiar
    //   - CONTRALOR/ADMIN: oculta todos los botones de acción
    if (_liderCtrlNonValidated) {
      btnRestoreAll.classList.add("hidden");
      const _btnClearNV = document.getElementById("btn-clear");
      if (_btnClearNV) _btnClearNV.style.display = "none";
      if (isContrAdminSess) {
        // CONTRALOR/ADMIN: sin ningún botón de acción
        btnSubmit.classList.add("hidden");
      }
      // Banner informativo
      if (formCardsContainer && !formCardsContainer.querySelector(".sc-no-validado")) {
        const _rolLabel = isContrAdminSess ? "Contralor/Administración" : "Líder";
        const _desc = isContrAdminSess
          ? "El registro aún no ha sido validado por el responsable. Solo puede visualizar la sección Gestor 1."
          : "El registro aún no ha sido validado. Puede validarlo usando el botón 'Validar Registro'.";
        const card = _buildStatusCard({
          variant: "prevencion", icon: "clock", count: "⏳",
          title: "Pendiente de validación",
          desc: _desc,
        });
        card.classList.add("sc-no-validado");
        formCardsContainer.appendChild(card);
      }
    }

    await renderFormWithSections(data.campos, gestor1Only, {
      gestor1Editable,
      showValidar,
      ownSectionReadonly,
      validadoInfo: { validado, fecha: fechaValid, por: validadoPor },
    });

    // Proteger campo AG según permisos
    _protectAGField(validado, isCreatedByMe, assignedToMe, isLiderCtrl);

    // Si el registro tiene NIT (campo E), cargar datos del prestador para fórmulas
    const nitVal = data.campos && data.campos["E"];
    if (nitVal) {
      try {
        const pRes = await fetch(`/api/prestador_por_nit?nit=${encodeURIComponent(nitVal)}`);
        if (pRes.ok) _currentPrestData = await pRes.json();
      } catch { /* ignorar */ }
    }
    // Recalcular fórmulas con datos existentes
    await recalcFormulas(null, _currentPrestData);

    // Semáforo inicial: aplicar colores a todos los campos AUTOMATICA numéricos con valor
    dynamicForm.querySelectorAll('[data-field-modo="AUTOMATICA"]').forEach(el => {
      if (!_NUMERIC_TIPOS.has(el.dataset.tipoDato || "")) return;
      _applyCalcFieldStyle(el.dataset.fieldCode, null);
    });

    // Si es solo lectura, deshabilitar todos los campos editables
    if (!canEdit) {
      dynamicForm.querySelectorAll("input:not([disabled]), select:not([disabled])").forEach(el => {
        el.disabled = true;
      });
      // Tarjeta de solo lectura (otra ciudad)
      if (formCardsContainer && !formCardsContainer.querySelector(".sc-readonly")) {
        const card = _buildStatusCard({
          variant: "neutro", icon: "lock", count: "🔒",
          title: "Solo lectura",
          desc: `Este registro pertenece a la ciudad responsable ${escapeHtml(data.ciudad_resp || "no asignada")}. No tiene permiso de edición.`,
        });
        card.classList.add("sc-readonly");
        formCardsContainer.appendChild(card);
      }
    }

    resetFieldSearch();
    showSection(formSection);
    attachNitValidation();
    attachFormDependencies();
    attachCurrencyInputs();
    applyFieldRules();
    attachFechaMaxHoyValidation();

    // Bloqueo de seguridad post-validación (ejecutado AL FINAL, después de applyFieldRules,
    // para evitar que ésta re-habilite campos que deben quedar bloqueados).
    // Si el registro está validado y el usuario no es líder/contralor, bloquear todo
    // campo que haya quedado activo fuera de la sección propia del usuario.
    if (validado && !isLiderCtrl) {
      const ownSec = dynamicForm.querySelector(".current-role-section");
      dynamicForm.querySelectorAll("input, select, textarea").forEach(el => {
        // Si la sección propia sigue siendo editable, respetar sus campos
        if (!ownSectionReadonly && ownSec && ownSec.contains(el)) return;
        el.disabled = true;
        el.style.pointerEvents = "none";
        el.tabIndex = -1;
      });
    }

    // ---- Bloqueo por estado BY = ENVIADA A CONTROLAR MEDICO NACIONAL ----
    const _byActualVal = ((data.campos && data.campos["BY"]) || "").trim();
    const _byEnviada   = _byActualVal === _BY_ENVIADA_VAL;
    const _isContralor = sessionPermisos.includes("CONTRALOR") || sessionIsAdmin;
    // LIDER con acceso extendido: puede editar aunque BY=ENVIADA
    const _liderExtAccess = _liderTieneAccesoContralor(data.campos);

    _byEnviadaLocked = _byEnviada && !_isContralor && !_liderExtAccess;

    if (_byEnviada) {
      if (_byEnviadaLocked) {
        // No-CONTRALOR y sin acceso extendido: bloquear todo el formulario
        if (formCardsContainer && !formCardsContainer.querySelector(".sc-by-enviada")) {
          const card = _buildStatusCard({
            variant: "prevencion", icon: "lock", count: "🔒",
            title: "Enviada a controlar",
            desc: "Registro en estado ENVIADA A CONTROLAR MEDICO NACIONAL. Solo el Contralor puede realizar modificaciones.",
          });
          card.classList.add("sc-by-enviada");
          formCardsContainer.appendChild(card);
        }
        dynamicForm.querySelectorAll("input, select, textarea").forEach(el => {
          el.disabled = true;
          el.style.pointerEvents = "none";
          el.tabIndex = -1;
        });
        btnSubmit.classList.add("hidden");
        btnRestoreAll.classList.add("hidden");
      } else if (_isContralor || _liderExtAccess) {
        // CONTRALOR o LIDER con acceso extendido: mostrar notificación y restringir BY dropdown
        if (_liderExtAccess && formCardsContainer && !formCardsContainer.querySelector(".sc-by-lider-ext")) {
          const card = _buildStatusCard({
            variant: "prevencion", icon: "unlock", count: "✏️",
            title: "Acceso extendido activo",
            desc: "El valor del registro cumple la condición de umbral. Puede editar campos de Contralor. BY solo puede cambiarse a DEVUELTO.",
          });
          card.classList.add("sc-by-lider-ext");
          formCardsContainer.appendChild(card);
        }
        // Restringir BY dropdown a solo ENVIADA y DEVUELTO
        const _byEl = dynamicForm.querySelector("[data-field-code='BY']");
        if (_byEl && _byEl.tagName === "SELECT") {
          [..._byEl.options].forEach(opt => {
            if (opt.value && opt.value !== _BY_ENVIADA_VAL && opt.value !== _BY_DEVUELTO_VAL) {
              opt.disabled = true;
              opt.style.display = "none";
            }
          });
        }
      }
    }

    // ---- Restringir BD para CONTRALOR: ocultar opción "CERRADO SIN FINALIZACIÓN" si no es el valor actual ----
    if (sessionPermisos.includes("CONTRALOR") && !sessionIsAdmin) {
      const _bdRestEl = dynamicForm.querySelector("[data-field-code='BD']");
      if (_bdRestEl && _bdRestEl.tagName === "SELECT") {
        const _bdCurNorm = (_bdRestEl.value || "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const _bdSinFinNorm = "CERRADO SIN FINALIZACION";
        if (_bdCurNorm !== _bdSinFinNorm) {
          [..._bdRestEl.options].forEach(opt => {
            const _optNorm = (opt.value || "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (_optNorm === _bdSinFinNorm) {
              opt.disabled = true;
              opt.style.display = "none";
            }
          });
        }
      }
    }

    // ---- Alerta de modificación para campos de acta (AB y AK) si ya tienen valor ----
    const _ACTA_ALERT = { AB: "NÚMERO ACTA CONCILIACIÓN CARTERA", AK: "N° ACTA CONCILIACIÓN FINIQUITO" };
    for (const [cod, nombre] of Object.entries(_ACTA_ALERT)) {
      const el = dynamicForm.querySelector(`#field_${cod}`);
      if (el && (el.value || "").trim()) {
        let _shown = false;
        el.addEventListener("focus", () => {
          if (_shown) return;
          _shown = true;
          showToast(`⚠️ Está modificando ${nombre} [${cod}]. Este campo ya tenía un valor asignado.`, "warning", 5000);
        });
      }
    }

    // ---- Bloqueo por AC = estado de cierre (al cargar registro existente) ----
    _applyACCierreLock();
    // ---- Bloqueo por BD = CERRADO SIN FINALIZACION (al cargar registro existente) ----
    _applyBDCierreLock();
    // ---- CONTRALOR: bloqueo total cuando BD = CERRADO SIN FINALIZACIÓN (no puede editar nada, debe reactivarse primero) ----
    {
      const _bdCLEl = dynamicForm.querySelector('[data-field-code="BD"]');
      const _bdCLNorm = (_bdCLEl ? (_bdCLEl.value || "") : "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (sessionPermisos.includes("CONTRALOR") && !sessionIsAdmin && _bdCLNorm === "CERRADO SIN FINALIZACION") {
        // Bloquear los campos que _applyBDCierreLock dejó habilitados (BD, AC, CF, CG)
        ["BD", "AC", "CF", "CG"].forEach(cod => {
          const _el = dynamicForm.querySelector(`[data-field-code="${cod}"]`);
          if (_el && !_el.disabled) {
            _el.disabled = true;
            _el.dataset._contralorBDLocked = "1";
            const _wrap = _el.closest(".field-row") || _el.parentElement;
            if (_wrap) _wrap.style.opacity = "0.5";
          }
        });
        // Actualizar banner con mensaje específico para CONTRALOR
        const _bdBanner = dynamicForm.querySelector(".bd-cierre-lock-banner");
        if (_bdBanner) {
          _bdBanner.innerHTML = "🔒 <strong>Registro cerrado sin finalización.</strong> Para realizar modificaciones el registro debe ser reactivado primero por el gestor responsable.";
          _bdBanner.style.background = "#FEE2E2";
          _bdBanner.style.borderColor = "#FCA5A5";
          _bdBanner.style.color = "#7F1D1D";
        }
        // Ocultar botón de guardar
        if (btnSubmit) btnSubmit.classList.add("hidden");
        if (btnRestoreAll) btnRestoreAll.classList.add("hidden");
      }
    }
    // ---- Bloqueo por CE = estado de cierre (al cargar registro existente) ----
    _applyCECierreLock();
    // CF y CG: visibles solo si el registro ya está cerrado (tienen valores guardados),
    // ocultos si aún no se ha cerrado. _cfcgRevealed permanece false para no activar
    // la validación estricta CG=hoy (que solo aplica al confirmar un nuevo cierre).
    _cfcgRevealed = false;
    _setCFCGVisibility(_anyLockActive(), false);
    // ---- Bloqueo campos O-CL cuando CE = TRAMITADO para GESTOR 2 y LIDER ----
    _applyCETramitadoLock();

    // ---- Inicializar valores previos de BD, CE y BY para los change handlers ----
    {
      const _rolLoad = (currentRole || "").trim().toUpperCase();
      const _esGLLoad = (_rolLoad.includes("GESTOR 2") || _rolLoad === "LIDER") && !sessionIsAdmin;

      const _bdElLoad = dynamicForm.querySelector('[data-field-code="BD"]');
      if (_bdElLoad) {
        const _bdValInit = (_bdElLoad.value || "").trim();
        _bdElLoad.dataset._prevBDValue = _bdValInit;
        // Si BD ya es TRAMITADO al cargar y el rol es GESTOR/LIDER, deshabilitar el campo
        if (_bdValInit === "TRAMITADO" && _esGLLoad) {
          _bdElLoad.disabled = true;
          const _bdWrapper = _bdElLoad.closest(".field-row") || _bdElLoad.parentElement;
          if (_bdWrapper) _bdWrapper.style.opacity = "0.45";
        }
      }

      const _ceElLoad = dynamicForm.querySelector('[data-field-code="CE"]');
      if (_ceElLoad) {
        _ceElLoad.dataset._prevCEValue = (_ceElLoad.value || "").trim();
        // Si CE ya es TRAMITADO al cargar y el rol es GESTOR/LIDER, deshabilitar el campo CE también
        if ((_ceElLoad.value || "").trim() === "TRAMITADO" && _esGLLoad) {
          _ceElLoad.disabled = true;
          const _ceWrapper = _ceElLoad.closest(".field-row") || _ceElLoad.parentElement;
          if (_ceWrapper) _ceWrapper.style.opacity = "0.45";
        }
      }

      const _byElLoad = dynamicForm.querySelector('[data-field-code="BY"]');
      if (_byElLoad) _byElLoad.dataset._prevBYValue = (_byElLoad.value || "").trim();
    }

    // ---- Botón Reabrir: visible solo a LIDER/CONTRALOR cuando el registro está cerrado ----
    if (btnReabrir && canEdit) {
      const _esLiderCtrlSession = sessionPermisos.includes("LIDER") || sessionPermisos.includes("CONTRALOR") || sessionIsAdmin;
      const _acValLoad = ((data.campos && data.campos["AC"]) || "").trim();
      const _bdValLoad = ((data.campos && data.campos["BD"]) || "").trim();
      const _ceValLoad = ((data.campos && data.campos["CE"]) || "").trim();
      const _registroCerradoLoad = (
        _AC_CIERRE_VALS_LOCK.includes(_acValLoad) ||
        _BD_CIERRE_VALS_LOCK.includes(_bdValLoad) ||
        _CE_CIERRE_VALS_LOCK.includes(_ceValLoad)
      );
      if (_esLiderCtrlSession && _registroCerradoLoad) {
        btnReabrir.classList.remove("hidden");
        btnSubmit.classList.add("hidden");
        btnRestoreAll.classList.add("hidden");
      } else {
        btnReabrir.classList.add("hidden");
      }
    }

    // ---- Mostrar/ocultar botón "Dividir Glosa" ----
    if (btnPartirGlosa) {
      const _valorA   = ((data.campos && data.campos.A) || "").trim();
      const _acValP   = ((data.campos && data.campos.AC) || "").trim();
      const _bdValP   = ((data.campos && data.campos.BD) || "").trim();
      const _ceValP   = ((data.campos && data.campos.CE) || "").trim();
      const _AC_CIERRE_PARTIR = ["CERRADO POR CANCELACION DE MESA", "CERRADO POR CANCELACION DE MESAS", "CERRADO SIN FINALIZACIÓN", "IPS NO ASISTE A MESAS"];
      const _esOriginal   = /^[A-Z]+\d+-\d+$/.test(_valorA);
      const _estaCerradoP = _AC_CIERRE_PARTIR.includes(_acValP) || _bdValP === "CERRADO SIN FINALIZACION" || _CE_CIERRE_VALS_CERRADOS.has(_ceValP);
      // Solo en registros validados y aprobados (sin estado N bloqueante)
      const _estadoNP     = (data.estado_aprobacion_n || "").trim();
      const _estaValidado = data.validado === true;
      const _estaAprobado = !_estadoNP || _estadoNP === "aprobado";
      // Verificar que queden compañías disponibles (no se ha llegado al máximo de divisiones)
      let _hayCompDisponible = false;
      if (_esOriginal && _valorA) {
        const _usadasSetP = new Set();
        const _valorD = ((data.campos && data.campos.D) || "").trim();
        if (_valorD) _usadasSetP.add(_valorD);
        allMainRecords.forEach(r => {
          if ((r.consecutivo || "").startsWith(_valorA + "-"))
            _usadasSetP.add((r.compania || "").trim());
        });
        _hayCompDisponible = COMPANIAS.some(c => !_usadasSetP.has(c));
      }
      if (_esOriginal && !_estaCerradoP && _estaValidado && _estaAprobado && _hayCompDisponible) {
        btnPartirGlosa.classList.remove("hidden");
      } else {
        btnPartirGlosa.classList.add("hidden");
      }
    }

    // ---- Botón Auditoría en formulario (solo ADMIN) ----
    const _btnAudForm = $("btn-auditoria-form");
    if (_btnAudForm) {
      if (sessionIsAdmin) {
        _btnAudForm.classList.remove("hidden");
        _btnAudForm.onclick = () => openAuditoriaModal(id, null);
      } else {
        _btnAudForm.classList.add("hidden");
      }
    }

    // ---- Estado de aprobación N (FECHA SOLICITUD CONCILIACIÓN IPS) ----
    {
      const estadoN       = (data.estado_aprobacion_n || "").trim();
      const esLiderSess   = sessionPermisos.includes("LIDER");
      const esContrSess   = sessionPermisos.includes("CONTRALOR") || sessionIsAdmin;
      const esCreadorSess = data.usuario === sessionUsuario;
      const esOtraRegional = data.pendiente_otra_regional === true;

      // Ocultar todos los botones N por defecto
      [btnAprobarN, btnRechazarN, btnCancelarN, btnReactivarN].forEach(b => b && b.classList.add("hidden"));

      // ── Registro de OTRA REGIONAL: solo lectura, sin acciones ──
      if (esOtraRegional) {
        btnSubmit.classList.add("hidden");
        btnRestoreAll.classList.add("hidden");
        dynamicForm.querySelectorAll("input, select, textarea").forEach(el => {
          el.disabled = true;
          el.style.pointerEvents = "none";
          el.tabIndex = -1;
        });
        dynamicForm.querySelectorAll(".aprobacion-n-notice").forEach(el => el.remove());
        if (formCardsContainer) {
          const _regionalC = data.ciudad_resp || "";
          formCardsContainer.appendChild(_buildStatusCard({
            variant: "info", icon: "eye", count: "N",
            title: "Pendiente — otra regional",
            desc: `Este registro pertenece a la regional "${_regionalC}" y está pendiente de aprobación por campo N. Solo puede visualizarlo.`,
          }));
        }
        // fin del bloque: saltar toda la lógica normal de estado N
      } else {

      // Eliminar banners N previos para evitar duplicados
      dynamicForm.querySelectorAll(".aprobacion-n-notice").forEach(el => el.remove());

      if (estadoN === "pendiente") {
        // Bloquear edición y submit normales
        btnSubmit.classList.add("hidden");
        btnRestoreAll.classList.add("hidden");

        // Deshabilitar todos los campos (igual que rechazado/cancelado para no-líder)
        if (!esLiderSess && !esContrSess) {
          dynamicForm.querySelectorAll("input, select, textarea").forEach(el => {
            el.disabled = true;
            el.style.pointerEvents = "none";
            el.tabIndex = -1;
          });
        }

        // Líder o Contralor pueden aprobar/rechazar
        if (esLiderSess || esContrSess) {
          if (btnAprobarN) btnAprobarN.classList.remove("hidden");
          if (btnRechazarN) btnRechazarN.classList.remove("hidden");
        }
        // Creador puede cancelar
        if (esCreadorSess) {
          if (btnCancelarN) btnCancelarN.classList.remove("hidden");
        }

        // Tarjeta N-pendiente
        if (formCardsContainer) {
          const _motivoDesc = data.comentario_solicitud_n
            ? `Pendiente de aprobación por campo N. Motivo: ${data.comentario_solicitud_n}`
            : "Pendiente de aprobación por campo N (>14 días). No se puede editar hasta que el líder apruebe o rechace.";
          formCardsContainer.appendChild(_buildStatusCard({
            variant: "prevencion", icon: "clock", count: "N",
            title: "Aprobación pendiente",
            desc: _motivoDesc,
            onAction: () => _showNHistorial(id),
          }));
        }

      } else if (estadoN === "rechazado") {
        // Solo Contralor puede modificar/reactivar
        if (!esContrSess) {
          btnSubmit.classList.add("hidden");
          btnRestoreAll.classList.add("hidden");
          dynamicForm.querySelectorAll("input, select, textarea").forEach(el => {
            el.disabled = true;
            el.style.pointerEvents = "none";
            el.tabIndex = -1;
          });
        }
        if (esContrSess) {
          if (btnReactivarN) btnReactivarN.classList.remove("hidden");
        }

        // Tarjeta N-rechazado
        if (formCardsContainer) {
          const _motivoRec = data.comentario_rechazo_n
            ? `Rechazado. Motivo: ${data.comentario_rechazo_n}${esContrSess ? " (Solo el Contralor puede re-aprobar.)" : ""}`
            : `Registro rechazado por campo N.${esContrSess ? " Solo el Contralor puede re-aprobar." : ""}`;
          formCardsContainer.appendChild(_buildStatusCard({
            variant: "alerta", icon: "xmark", count: "N",
            title: "Solicitud rechazada",
            desc: _motivoRec,
            onAction: () => _showNHistorial(id),
          }));
        }

      } else if (estadoN === "cancelado") {
        // Solo lectura: nadie puede editar un registro cancelado
        btnSubmit.classList.add("hidden");
        btnRestoreAll.classList.add("hidden");
        dynamicForm.querySelectorAll("input, select, textarea").forEach(el => {
          el.disabled = true;
          el.style.pointerEvents = "none";
          el.tabIndex = -1;
        });

        // Tarjeta N-cancelado
        if (formCardsContainer) {
          formCardsContainer.appendChild(_buildStatusCard({
            variant: "neutro", icon: "ban", count: "N",
            title: "Solicitud cancelada",
            desc: "Solicitud de aprobación por campo N cancelada. Registro en solo lectura.",
            onAction: () => _showNHistorial(id),
          }));
        }
      } // fin if/else-if cadena estadoN
      } // fin else (lógica normal estado N — esOtraRegional = false)

      // El historial-N se carga bajo demanda al pulsar "+" en la tarjeta (_showNHistorial)

      // ---- Wire click handlers para botones N ----
      if (btnAprobarN) {
        btnAprobarN.onclick = async () => {
          const res = await fetch(`/api/registro/${id}/aprobar-n`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ comentario: "" }),
          });
          if (res.ok) {
            showToast("Solicitud N aprobada correctamente.", "success");
            await loadMainRecords();
            showSection(pendientesNSection);
          } else {
            const err = await res.json().catch(() => ({}));
            showToast(err.detail || "Error al aprobar.", "error");
          }
        };
      }

      if (btnRechazarN) {
        btnRechazarN.onclick = async () => {
          let comentario;
          try { comentario = await _pedirComentarioRechazoN(); } catch { return; }
          const res = await fetch(`/api/registro/${id}/rechazar-n`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ comentario }),
          });
          if (res.ok) {
            showToast("Solicitud N rechazada.", "success");
            await loadMainRecords();
            showSection(pendientesNSection);
          } else {
            const err = await res.json().catch(() => ({}));
            showToast(err.detail || "Error al rechazar.", "error");
          }
        };
      }

      if (btnCancelarN) {
        btnCancelarN.onclick = async () => {
          if (!confirm("¿Está seguro de cancelar esta solicitud de aprobación por campo N?")) return;
          const res = await fetch(`/api/registro/${id}/cancelar-n`, { method: "POST" });
          if (res.ok) {
            showToast("Solicitud N cancelada.", "success");
            await loadMainRecords();
            showSection(mainSection);
          } else {
            const err = await res.json().catch(() => ({}));
            showToast(err.detail || "Error al cancelar.", "error");
          }
        };
      }

      if (btnReactivarN) {
        btnReactivarN.onclick = async () => {
          let comentario;
          try { comentario = await _pedirComentarioReactivarN(); } catch { return; }
          const res = await fetch(`/api/registro/${id}/reactivar-n`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ comentario }),
          });
          if (res.ok) {
            showToast("Registro re-aprobado por Contralor.", "success");
            await loadMainRecords();
            showSection(rechazadosNSection);
          } else {
            const err = await res.json().catch(() => ({}));
            showToast(err.detail || "Error al re-aprobar.", "error");
          }
        };
      }
    }

    // ---- Bloqueo total para registros finalizados (debe ejecutarse al final para sobrescribir cualquier otra lógica) ----
    if (esFinalizado) {
      // Deshabilitar todos los campos del formulario
      dynamicForm.querySelectorAll("input, select, textarea").forEach(el => {
        el.disabled = true;
        el.style.pointerEvents = "none";
        el.tabIndex = -1;
      });
      // Ocultar todos los botones de acción del formulario
      [btnSubmit, btnRestoreAll, $("btn-clear"), $("btn-partir-glosa"),
       $("btn-aprobar-n"), $("btn-rechazar-n"), $("btn-cancelar-n"),
       $("btn-reactivar-n"), $("btn-auditoria-form"), btnReabrir].forEach(b => {
        if (b) b.classList.add("hidden");
      });
      // Mostrar banner de proceso finalizado (si no existe ya)
      if (formCardsContainer && !formCardsContainer.querySelector(".sc-finalizado")) {
        const card = _buildStatusCard({
          variant: "success", icon: "check", count: "✔",
          title: "Proceso finalizado",
          desc: "Este registro ha sido finalizado (CE=TRAMITADO, AC=CERRADO CON ACTA, BD=TRAMITADO). Solo lectura.",
        });
        card.classList.add("sc-finalizado");
        formCardsContainer.prepend(card);
      }
    }

    // ---- Banner de auditoría activa para destinatario (no-ADMIN) ----
    _loadAuditoriaEnForm(id);
  }

  // ---------------------------------------------------------------
  // AUTH: Logout
  // ---------------------------------------------------------------
  btnLogout.addEventListener("click", async () => {
    await fetch("/api/logout", { method: "POST" });
    // Limpiar estado de navegación — evitar que otro usuario entre directo al registro previo
    sessionStorage.removeItem("rur_last_edit_id");
    sessionStorage.removeItem("rur_last_edit_ts");
    sessionStorage.removeItem("rur_last_view");
    if (notifPollInterval) { clearInterval(notifPollInterval); notifPollInterval = null; }
    closeNotifPanel();
    notifBadge.classList.add("hidden");
    appScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    loginUser.value = "";
    loginPass.value = "";
    loginError.classList.add("hidden");
    currentRole = null;
    sessionRol = null;
    allMainRecords = [];
    activeGestorFilter = "";
    activeRegionFilter = "";
    activeLiderFilter  = "";
    mainFilters.classList.add("hidden");
    mainSections.innerHTML = "";
  });


  // ---------------------------------------------------------------
  // CUOTAS: Helpers para el widget dinámico de cuotas
  // ---------------------------------------------------------------

  // Modal de confirmación personalizado para operaciones de cuota.
  // Devuelve Promise<boolean>: true = Aceptar, false = Cancelar.
  function _cuotaConfirm(title, bodyHTML) {
    return new Promise(resolve => {
      const overlay = $("cuota-confirm-modal-overlay");
      $("cuota-confirm-title").textContent = title;
      $("cuota-confirm-body").innerHTML = bodyHTML;
      overlay.classList.remove("hidden");
      const cleanup = (result) => {
        overlay.classList.add("hidden");
        $("btn-cuota-confirm-ok").removeEventListener("click", onOk);
        $("btn-cuota-confirm-cancel").removeEventListener("click", onCancel);
        resolve(result);
      };
      const onOk     = () => cleanup(true);
      const onCancel = () => cleanup(false);
      $("btn-cuota-confirm-ok").addEventListener("click", onOk);
      $("btn-cuota-confirm-cancel").addEventListener("click", onCancel);
    });
  }

  // Valida que las fechas tentativas de cuotas g2 estén en orden ascendente estricto.
  // Aplica/limpia estilos de error en cada input. Devuelve true si hay errores.
  function _validateCuotaFechas() {
    const widget = dynamicForm.querySelector('.cuotas-widget[data-cuota-type="g2"]');
    if (!widget) return false;
    const rows = widget.querySelectorAll('.cuota-row');
    // Recoger inputs de fecha tentativa en orden de aparición
    const fechaItems = [];
    rows.forEach(row => {
      const idxAttr = row.dataset.cuotaIdx;
      if (idxAttr === undefined) return;
      const def = _CUOTA_DEF[parseInt(idxAttr)];
      if (!def) return;
      const inp = row.querySelector(`[data-field-code="${def.fecha_tent}"]`);
      if (inp) fechaItems.push({ inp, n: def.n });
    });
    // Limpiar errores previos
    fechaItems.forEach(({ inp }) => {
      inp.classList.remove("cuota-fecha-error");
      const errSpan = inp.parentElement?.querySelector('.cuota-fecha-error-msg');
      if (errSpan) { errSpan.style.display = "none"; errSpan.textContent = ""; }
    });
    let hasError = false;

    // ── Validación 1: orden ascendente estricto entre fechas ingresadas ──────
    let prevDate = null;
    let prevN = null;
    fechaItems.forEach(({ inp, n }) => {
      if (!inp.value) { prevDate = null; prevN = null; return; }
      const cur = new Date(inp.value);
      if (prevDate !== null && cur <= prevDate) {
        inp.classList.add("cuota-fecha-error");
        const errSpan = inp.parentElement?.querySelector('.cuota-fecha-error-msg');
        if (errSpan) {
          errSpan.textContent = `⚠ Debe ser posterior a la fecha de la cuota ${prevN}`;
          errSpan.style.display = "block";
        }
        hasError = true;
      } else {
        prevDate = cur;
        prevN = n;
      }
    });

    // ── Validación 2: día hábil (no fin de semana, no festivo) ───────────────
    // Usa el caché de festivos si ya fue cargado; si aún no, omite esta
    // validación en tiempo real (se aplica igualmente al guardar).
    const festSet = _festivosSet || new Set();
    fechaItems.forEach(({ inp, n }) => {
      if (!inp.value) return;
      if (inp.classList.contains("cuota-fecha-error")) return; // ya tiene error de orden
      const d   = new Date(inp.value + "T12:00:00");
      const dow = d.getDay(); // 0=dom, 6=sab
      const iso = inp.value;
      if (dow === 0 || dow === 6 || festSet.has(iso)) {
        inp.classList.add("cuota-fecha-error");
        const errSpan = inp.parentElement?.querySelector('.cuota-fecha-error-msg');
        if (errSpan) {
          errSpan.textContent = (dow === 0 || dow === 6)
            ? `⚠ Cuota ${n}: debe ser día hábil (no fin de semana)`
            : `⚠ Cuota ${n}: debe ser día hábil (es festivo)`;
          errSpan.style.display = "block";
        }
        hasError = true;
      }
    });

    return hasError;
  }

  // Valida que en cada fila de cuotas g2: monto y fecha tentativa estén ambos llenos o ambos vacíos.
  // Además valida que no haya huecos (cuota vacía entre dos llenas).
  // Aplica/limpia estilos de error en los inputs afectados. Devuelve true si hay errores.
  function _validateCuotaDuplas() {
    const widget = dynamicForm.querySelector('.cuotas-widget[data-cuota-type="g2"]');
    if (!widget) return false;
    const rows = widget.querySelectorAll('.cuota-row');
    let hasError = false;

    // Recoger estado de cada fila (llena / vacía)
    const items = [];
    rows.forEach(row => {
      const idxAttr = row.dataset.cuotaIdx;
      if (idxAttr === undefined) return;
      const def = _CUOTA_DEF[parseInt(idxAttr)];
      if (!def) return;
      const mInp = row.querySelector(`[data-field-code="${def.monto}"]`);
      const fInp = row.querySelector(`[data-field-code="${def.fecha_tent}"]`);
      if (!mInp || !fInp) return;
      const rawMonto = mInp.dataset.rawValue !== undefined ? mInp.dataset.rawValue : _rawCurrencyValue(mInp.value);
      const tieneMonto = rawMonto !== "" && parseFloat(String(rawMonto).replace(/[^\d.-]/g, "")) > 0;
      const tieneFecha = !!fInp.value;
      items.push({ row, def, mInp, fInp, tieneMonto, tieneFecha });
    });

    // Limpiar errores de dupla previos
    items.forEach(({ mInp, fInp }) => {
      mInp.classList.remove("cuota-fecha-error");
      fInp.classList.remove("cuota-fecha-error");
      const mErr = mInp.parentElement?.querySelector('.cuota-monto-error-msg');
      const fErr = fInp.parentElement?.querySelector('.cuota-fecha-error-msg');
      if (mErr) { mErr.style.display = "none"; mErr.textContent = ""; }
      if (fErr) { fErr.style.display = "none"; fErr.textContent = ""; }
    });

    // ── Validación 1: dupla incompleta (uno lleno, el otro vacío) ────────────
    items.forEach(({ def, mInp, fInp, tieneMonto, tieneFecha }) => {
      if (tieneMonto && !tieneFecha) {
        fInp.classList.add("cuota-fecha-error");
        const fErr = fInp.parentElement?.querySelector('.cuota-fecha-error-msg');
        if (fErr) { fErr.textContent = `⚠ Cuota ${def.n}: la fecha tentativa es obligatoria si hay monto`; fErr.style.display = "block"; }
        hasError = true;
      } else if (!tieneMonto && tieneFecha) {
        mInp.classList.add("cuota-fecha-error");
        const mErr = mInp.parentElement?.querySelector('.cuota-monto-error-msg');
        if (mErr) { mErr.textContent = `⚠ Cuota ${def.n}: el monto es obligatorio si hay fecha tentativa`; mErr.style.display = "block"; }
        hasError = true;
      }
    });

    // ── Validación 2: sin huecos — una cuota vacía seguida de una llena ──────
    let encontroVacia = false;
    let nPrimeraVacia = null;
    items.forEach(({ def, mInp, fInp, tieneMonto, tieneFecha }) => {
      const llena = tieneMonto && tieneFecha;
      const vacia = !tieneMonto && !tieneFecha;
      if (vacia && !encontroVacia) {
        encontroVacia = true;
        nPrimeraVacia = def.n;
      } else if (llena && encontroVacia) {
        // Cuota llena después de una vacía → error en los inputs de esta cuota
        mInp.classList.add("cuota-fecha-error");
        fInp.classList.add("cuota-fecha-error");
        const mErr = mInp.parentElement?.querySelector('.cuota-monto-error-msg');
        const fErr = fInp.parentElement?.querySelector('.cuota-fecha-error-msg');
        if (mErr) { mErr.textContent = `⚠ Cuota ${def.n}: debe llenarse en orden (cuota ${nPrimeraVacia} está vacía)`; mErr.style.display = "block"; }
        if (fErr) { fErr.textContent = `⚠ Cuota ${def.n}: debe llenarse en orden (cuota ${nPrimeraVacia} está vacía)`; fErr.style.display = "block"; }
        hasError = true;
      }
    });

    return hasError;
  }

  // Valida que si BF (VALOR ASUMIDO EPS) es 0 o vacío, ninguna cuota monto tenga valor.
  // Devuelve true si no hay errores.
  function _validarCuotasSinBF() {
    if (!dynamicForm) return true;
    const bfEl = dynamicForm.querySelector('[data-field-code="BF"]');
    const bfRaw = (bfEl?.dataset.rawValue !== undefined && bfEl.dataset.rawValue !== "")
      ? bfEl.dataset.rawValue
      : (bfEl?.value || "0");
    const bfVal = parseFloat(bfRaw.toString().replace(/[^\d.-]/g, "")) || 0;

    if (bfVal > 0) {
      _CUOTA_DEF.forEach(def => {
        const el = dynamicForm.querySelector(`[data-field-code="${def.monto}"]`);
        if (!el) return;
        el.classList.remove("field-required-error");
        const errSpan = el.parentElement?.querySelector(".cuota-monto-error-msg");
        if (errSpan && errSpan.dataset.bfErr === "1") { errSpan.textContent = ""; errSpan.style.display = "none"; delete errSpan.dataset.bfErr; }
      });
      return true;
    }

    let hayError = false;
    _CUOTA_DEF.forEach(def => {
      const el = dynamicForm.querySelector(`[data-field-code="${def.monto}"]`);
      if (!el) return;
      const raw = el.dataset.rawValue !== undefined ? el.dataset.rawValue : _rawCurrencyValue(el.value);
      const n = parseFloat((raw || "0").toString().replace(/[^\d.-]/g, "")) || 0;
      const errSpan = el.parentElement?.querySelector(".cuota-monto-error-msg");
      if (n > 0) {
        el.classList.add("field-required-error");
        if (errSpan) { errSpan.textContent = `⚠ Cuota ${def.n}: requiere VALOR ASUMIDO EPS [BF]`; errSpan.style.display = "block"; errSpan.dataset.bfErr = "1"; }
        hayError = true;
      } else {
        el.classList.remove("field-required-error");
        if (errSpan && errSpan.dataset.bfErr === "1") { errSpan.textContent = ""; errSpan.style.display = "none"; delete errSpan.dataset.bfErr; }
      }
    });
    return !hayError;
  }

  function _validateFechasRealesPago(skipUnchanged = false) {
    const widget = dynamicForm.querySelector('.cuotas-widget[data-cuota-type="contralor"]');
    if (!widget) return false;
    const todayStr = new Date().toISOString().slice(0, 10);
    let hasError = false;
    _CUOTA_DEF.forEach(def => {
      const inp = widget.querySelector(`[data-field-code="${def.fecha_real}"]`);
      if (!inp) return;
      const errSpan = inp.parentElement?.querySelector('.cuota-fecha-error-msg');
      if (!inp.value) {
        inp.classList.remove("cuota-fecha-error");
        if (errSpan) { errSpan.style.display = "none"; errSpan.textContent = ""; }
        return;
      }
      // Al editar, si el valor no cambió respecto al original, no re-validar
      if (skipUnchanged) {
        const _valOrig = ((_originalCampos[def.fecha_real] || "")).toString().trim();
        if (inp.value === _valOrig) {
          inp.classList.remove("cuota-fecha-error");
          if (errSpan) { errSpan.style.display = "none"; errSpan.textContent = ""; }
          return;
        }
      }
      if (inp.value > todayStr) {
        inp.classList.add("cuota-fecha-error");
        if (errSpan) { errSpan.textContent = "⚠ La fecha real no puede ser futura"; errSpan.style.display = "block"; }
        hasError = true;
      } else {
        inp.classList.remove("cuota-fecha-error");
        if (errSpan) { errSpan.style.display = "none"; errSpan.textContent = ""; }
      }
    });
    return hasError;
  }

  function _applyCalcFieldStyle(code, val) {
    const el = document.querySelector(`[data-field-code="${code}"]`);
    if (!el) return;
    const raw = el.dataset.rawValue !== undefined ? el.dataset.rawValue : el.value;
    const numVal = parseFloat(String(raw).replace(/[^\d.-]/g, ''));
    if (raw === "" || isNaN(numVal)) {
      el.style.background = "";
      el.style.color = "";
      el.style.borderColor = "";
    } else if (numVal < 0) {
      el.style.background = "#FEF2F2";
      el.style.color = "#DC2626";
      el.style.borderColor = "#DC2626";
    } else {
      el.style.background = "#F0FDF4";
      el.style.color = "#166534";
      el.style.borderColor = "#16A34A";
    }
  }

  // Actualiza visibilidad del botón Eliminar: solo visible en la última fila (si hay >1)
  function _cuotaRefreshRemoveBtns(list) {
    const rows = list.querySelectorAll(".cuota-row");
    rows.forEach((row, idx) => {
      const btn = row.querySelector(".btn-remove-cuota");
      if (btn) btn.style.display = (rows.length <= 1 || idx < rows.length - 1) ? "none" : "";
    });
  }

  // Construye una fila de cuota (índice 0-7)
  function _makeCuotaRow(idx, existingCampos, isEditable, type) {
    const def = _CUOTA_DEF[idx];
    const row = document.createElement("div");
    row.className = "cuota-row";
    row.dataset.cuotaIdx = idx;

    const rowHeader = document.createElement("div");
    rowHeader.className = "cuota-row-header";
    const lbl = document.createElement("span");
    lbl.className = "cuota-row-label";
    lbl.textContent = `Cuota ${def.n}`;
    rowHeader.appendChild(lbl);
    row.appendChild(rowHeader);

    const fieldsWrap = document.createElement("div");
    fieldsWrap.className = "cuota-row-fields";

    if (type === "g2") {
      // --- VR PAGO (Moneda) ---
      const mGrp = document.createElement("div");
      mGrp.className = "cuota-field-group";
      const mLbl = document.createElement("label");
      mLbl.textContent = (currentFields.find(f => f.codigo === def.monto)?.nombre || "VR PAGO").trim();
      mLbl.setAttribute("for", `field_${def.monto}`);
      mGrp.appendChild(mLbl);
      const mSpan = document.createElement("span");
      mSpan.className = "field-code";
      mSpan.textContent = `[${def.monto}]`;
      mLbl.appendChild(mSpan);
      const mInp = document.createElement("input");
      mInp.type = "text";
      mInp.id = `field_${def.monto}`;
      mInp.name = `field_${def.monto}`;
      mInp.dataset.fieldCode = def.monto;
      mInp.dataset.currency = "true";
      mInp.placeholder = "$ 0";
      if (!isEditable) { mInp.readOnly = true; mInp.style.background = "#f0f4fa"; mInp.style.color = "#555"; }
      const rawMonto = existingCampos?.[def.monto];
      if (rawMonto != null && rawMonto !== "") {
        mInp.dataset.rawValue = String(rawMonto);
        mInp.value = _formatCurrencyDisplay(String(rawMonto));
      }
      if (isEditable) {
        _attachCurrencyToInput(mInp);
        mInp.addEventListener("change", () => { recalcFormulas(def.monto, _currentPrestData); _validateCuotaDuplas(); _validarCuotasSinBF(); });
        mInp.addEventListener("input",  () => { recalcFormulas(def.monto, _currentPrestData); _validateCuotaDuplas(); _validarCuotasSinBF(); });
      }
      const mErrMsg = document.createElement("span");
      mErrMsg.className = "cuota-monto-error-msg";
      mGrp.appendChild(mInp);
      mGrp.appendChild(mErrMsg);
      fieldsWrap.appendChild(mGrp);

      // --- FECHA TENTATIVA (Fecha) ---
      const fGrp = document.createElement("div");
      fGrp.className = "cuota-field-group";
      const fLbl = document.createElement("label");
      fLbl.textContent = (currentFields.find(f => f.codigo === def.fecha_tent)?.nombre || "FECHA TENTATIVA").trim();
      fLbl.setAttribute("for", `field_${def.fecha_tent}`);
      fGrp.appendChild(fLbl);
      const fSpan = document.createElement("span");
      fSpan.className = "field-code";
      fSpan.textContent = `[${def.fecha_tent}]`;
      fLbl.appendChild(fSpan);
      const fInp = document.createElement("input");
      fInp.type = "date";
      fInp.id = `field_${def.fecha_tent}`;
      fInp.name = `field_${def.fecha_tent}`;
      fInp.dataset.fieldCode = def.fecha_tent;
      if (!isEditable) { fInp.readOnly = true; fInp.style.background = "#f0f4fa"; }
      if (existingCampos?.[def.fecha_tent]) fInp.value = existingCampos[def.fecha_tent];
      if (isEditable) {
        fInp.addEventListener("change", () => { recalcFormulas(def.fecha_tent, _currentPrestData); _validateCuotaFechas(); _validateCuotaDuplas(); });
        fInp.addEventListener("input",  () => { recalcFormulas(def.fecha_tent, _currentPrestData); _validateCuotaFechas(); _validateCuotaDuplas(); });
      }
      const fErrMsg = document.createElement("span");
      fErrMsg.className = "cuota-fecha-error-msg";
      fGrp.appendChild(fInp);
      fGrp.appendChild(fErrMsg);
      fieldsWrap.appendChild(fGrp);

    } else {
      // type === "contralor": solo FECHA REAL DE PAGO
      const fGrp = document.createElement("div");
      fGrp.className = "cuota-field-group";
      const fLbl = document.createElement("label");
      fLbl.textContent = (currentFields.find(f => f.codigo === def.fecha_real)?.nombre || "FECHA REAL PAGO").trim();
      fLbl.setAttribute("for", `field_${def.fecha_real}`);
      fGrp.appendChild(fLbl);
      const fSpan = document.createElement("span");
      fSpan.className = "field-code";
      fSpan.textContent = `[${def.fecha_real}]`;
      fLbl.appendChild(fSpan);
      const fInp = document.createElement("input");
      fInp.type = "date";
      fInp.id = `field_${def.fecha_real}`;
      fInp.name = `field_${def.fecha_real}`;
      fInp.dataset.fieldCode = def.fecha_real;
      if (!isEditable) { fInp.readOnly = true; fInp.style.background = "#f0f4fa"; }
      if (existingCampos?.[def.fecha_real]) fInp.value = existingCampos[def.fecha_real];
      const fRealErrMsg = document.createElement("span");
      fRealErrMsg.className = "cuota-fecha-error-msg";
      if (isEditable) {
        fInp.addEventListener("input",  () => _validateFechasRealesPago());
        fInp.addEventListener("change", () => _validateFechasRealesPago());
      }
      fGrp.appendChild(fInp);
      fGrp.appendChild(fRealErrMsg);
      fieldsWrap.appendChild(fGrp);
    }

    row.appendChild(fieldsWrap);

    // Botón eliminar: solo en g2 (contralor sigue automáticamente)
    if (isEditable && type === "g2") {
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn-remove-cuota";
      removeBtn.textContent = "✕ Eliminar";
      removeBtn.style.display = "none";
      removeBtn.addEventListener("click", async () => {
        const list = row.closest(".cuotas-list");
        const rows = list.querySelectorAll(".cuota-row");
        if (rows.length <= 1) { showToast("Debe existir al menos una cuota.", "error"); return; }
        const d = _CUOTA_DEF[idx];
        // Confirmación si la cuota ya tiene datos
        const montoEl = row.querySelector(`[data-field-code="${d.monto}"]`);
        const fechaEl = row.querySelector(`[data-field-code="${d.fecha_tent}"]`);
        const hasMonto = parseFloat(montoEl?.dataset.rawValue || "0") > 0;
        const hasFecha = !!(fechaEl?.value);
        if (hasMonto || hasFecha) {
          const ok = await _cuotaConfirm(
            `¿Eliminar CUOTA ${d.n}?`,
            `<p>Esta acción afectará:</p>
             <ul style="margin:.5rem 0 .5rem 1.2rem;color:#DC2626">
               <li>VR PAGO y FECHA TENTATIVA de la Cuota ${d.n}</li>
               <li>FECHA REAL DE PAGO de la Cuota ${d.n}</li>
             </ul>
             <p>¿Desea continuar?</p>`
          );
          if (!ok) return;
        }
        _clearedCuotaCodes.add(d.monto); _clearedCuotaCodes.add(d.fecha_tent);
        _clearedCuotaCodes.add(d.fecha_real);
        row.remove();
        _cuotaRefreshRemoveBtns(list);
        // Sync: quitar última fila del widget contralor
        const contralorList = dynamicForm.querySelector('.cuotas-widget[data-cuota-type="contralor"] .cuotas-list');
        if (contralorList) {
          const cRows = contralorList.querySelectorAll(".cuota-row");
          const g2Rows = list.querySelectorAll(".cuota-row");
          if (cRows.length > g2Rows.length) cRows[cRows.length - 1].remove();
        }
        recalcFormulas(null, _currentPrestData);
      });
      rowHeader.appendChild(removeBtn);
    }

    return row;
  }

  // Construye el widget completo de cuotas
  function _buildCuotasWidget(existingCampos, isEditable, type) {
    const widget = document.createElement("div");
    widget.className = "cuotas-widget";
    widget.dataset.cuotaType = type;

    const header = document.createElement("div");
    header.className = "cuotas-widget-header";
    const title = document.createElement("span");
    title.className = "cuotas-widget-title";
    title.textContent = type === "g2" ? "CUOTAS DE PAGO" : "FECHAS REALES DE PAGO";
    header.appendChild(title);
    widget.appendChild(header);

    // Botón agregar: solo en g2; contralor sigue automáticamente
    if (isEditable && type === "g2") {
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "btn-add-cuota";
      addBtn.textContent = "+ Agregar cuota";
      header.appendChild(addBtn);

      addBtn.addEventListener("click", () => {
        const list = widget.querySelector(".cuotas-list");
        const rows = list.querySelectorAll(".cuota-row");
        if (rows.length >= _MAX_CUOTAS) {
          showToast(`Máximo ${_MAX_CUOTAS} cuotas permitidas.`, "error");
          return;
        }
        const newIdx = rows.length;
        const newRow = _makeCuotaRow(newIdx, {}, true, "g2");
        const d = _CUOTA_DEF[newIdx];
        _clearedCuotaCodes.delete(d.monto); _clearedCuotaCodes.delete(d.fecha_tent);
        _clearedCuotaCodes.delete(d.fecha_real);
        list.appendChild(newRow);
        _cuotaRefreshRemoveBtns(list);
        // Sync: agregar fila correspondiente en widget contralor
        const contralorList = dynamicForm.querySelector('.cuotas-widget[data-cuota-type="contralor"] .cuotas-list');
        if (contralorList) {
          const cRows = contralorList.querySelectorAll(".cuota-row");
          if (cRows.length <= newIdx) {
            const cIsEditable = !contralorList.closest('.cuotas-widget')?.querySelector('.btn-add-cuota') === false;
            contralorList.appendChild(_makeCuotaRow(newIdx, {}, true, "contralor"));
          }
        }
        recalcFormulas(null, _currentPrestData);
      });
    }

    const list = document.createElement("div");
    list.className = "cuotas-list";

    // Determinar cuántas filas mostrar inicialmente (mínimo 1)
    let initialRows = 1;
    if (existingCampos) {
      for (let i = _MAX_CUOTAS - 1; i >= 0; i--) {
        const d = _CUOTA_DEF[i];
        const hasData = type === "g2"
          ? (existingCampos[d.monto] || existingCampos[d.fecha_tent])
          : existingCampos[d.fecha_real];
        if (hasData) { initialRows = i + 1; break; }
      }
      // Contralor: mostrar al menos tantas filas como cuotas g2 configuradas
      if (type === "contralor") {
        for (let i = _MAX_CUOTAS - 1; i >= 0; i--) {
          const d = _CUOTA_DEF[i];
          if (existingCampos[d.monto] || existingCampos[d.fecha_tent]) {
            initialRows = Math.max(initialRows, i + 1);
            break;
          }
        }
      }
    }

    for (let i = 0; i < initialRows; i++) {
      list.appendChild(_makeCuotaRow(i, existingCampos, isEditable, type));
    }
    widget.appendChild(list);
    if (isEditable) _cuotaRefreshRemoveBtns(list);

    return widget;
  }

  // ── Widget Devoluciones/Retroalimentaciones ─────────────────────────────────

  function _devRefreshRemoveBtns(list) {
    const rows = list.querySelectorAll(".dev-row");
    rows.forEach((row, i) => {
      const btn = row.querySelector(".btn-remove-dev");
      if (btn) btn.style.display = (rows.length > 1 && i === rows.length - 1) ? "inline-flex" : "none";
    });
  }

  function _makeDevField(code, existingCampos, isEditable, inputType) {
    const fieldDef = currentFields.find(function(f) { return f.codigo === code; });
    const grp = document.createElement("div");
    grp.className = "cuota-field-group";
    const lbl = document.createElement("label");
    lbl.setAttribute("for", "field_" + code);
    lbl.textContent = (fieldDef ? fieldDef.nombre : code).trim();
    const span = document.createElement("span");
    span.className = "field-code";
    span.textContent = "[" + code + "]";
    lbl.appendChild(span);
    grp.appendChild(lbl);
    if (inputType === "select") {
      const sel = document.createElement("select");
      sel.id = "field_" + code;
      sel.name = "field_" + code;
      sel.dataset.fieldCode = code;
      if (!isEditable) sel.disabled = true;
      const blank = document.createElement("option");
      blank.value = ""; blank.textContent = "— Seleccione —";
      sel.appendChild(blank);
      (fieldDef && fieldDef.opciones ? fieldDef.opciones : []).forEach(function(o) {
        const opt = document.createElement("option");
        opt.value = o; opt.textContent = o;
        sel.appendChild(opt);
      });
      if (existingCampos && existingCampos[code]) sel.value = existingCampos[code];
      grp.appendChild(sel);
    } else if (inputType === "textarea") {
      const taContainer = document.createElement("div");
      taContainer.style.display = "flex";
      taContainer.style.gap = "0.75rem";
      taContainer.style.alignItems = "flex-end";
      taContainer.style.width = "100%";

      const textarea = document.createElement("textarea");
      textarea.id = "field_" + code;
      textarea.name = "field_" + code;
      textarea.dataset.fieldCode = code;
      if (!isEditable) { textarea.readOnly = true; textarea.style.background = "#f0f4fa"; }
      textarea.style.flex = "1";
      textarea.style.height = "38px";
      textarea.style.minHeight = "38px";
      textarea.style.maxHeight = "150px";
      textarea.style.padding = "0.5rem 0.75rem";
      textarea.style.border = "1px solid #ccc";
      textarea.style.borderRadius = "4px";
      textarea.style.fontFamily = "inherit";
      textarea.style.fontSize = "0.9rem";
      textarea.style.resize = "vertical";
      textarea.style.overflow = "hidden";
      textarea.style.boxSizing = "border-box";
      textarea.placeholder = "Escriba aquí...";
      if (existingCampos && existingCampos[code]) {
        textarea.value = existingCampos[code];
        // Ajustar altura al valor existente
        setTimeout(function() {
          textarea.style.height = "auto";
          textarea.style.height = Math.min(textarea.scrollHeight, 150) + "px";
        }, 0);
      }
      textarea.addEventListener("input", function() {
        textarea.style.height = "auto";
        textarea.style.height = Math.min(textarea.scrollHeight, 300) + "px";
      });

      const btnExpandir = document.createElement("button");
      btnExpandir.type = "button";
      btnExpandir.style.padding = "0";
      btnExpandir.style.width = "44px";
      btnExpandir.style.height = "44px";
      btnExpandir.style.background = "transparent";
      btnExpandir.style.border = "none";
      btnExpandir.style.cursor = "pointer";
      btnExpandir.style.flexShrink = "0";
      btnExpandir.style.display = "inline-flex";
      btnExpandir.style.alignItems = "center";
      btnExpandir.style.justifyContent = "center";
      btnExpandir.innerHTML = '<svg width="24" height="19" viewBox="0 0 58 46" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M55.625 21.4062C50.5625 9.875 40.4375 2 29 2C17.4688 2 7.34375 9.875 2.28125 21.4062C2.09375 21.875 2 22.5312 2 23C2 23.4688 2.09375 24.2188 2.28125 24.6875C7.34375 36.2188 17.4688 44 29 44C40.4375 44 50.5625 36.2188 55.625 24.6875C55.8125 24.2188 56 23.4688 56 23C56 22.5312 55.8125 21.875 55.625 21.4062ZM42.5 23C42.5 30.5 36.4062 36.5 29 36.5C21.5 36.5 15.5 30.5 15.5 23C15.5 15.5938 21.5 9.5 29 9.5C36.4062 9.5 42.5 15.5938 42.5 23ZM29 14C28.7188 14 28.4375 14.0938 28.1562 14.0938C28.625 14.9375 29 15.9688 29 17C29 20.375 26.2812 23 23 23C21.875 23 20.8438 22.7188 20 22.25C20 22.5312 20 22.8125 20 23C20 27.9688 24.0312 32 29 32C33.9688 32 38 28.0625 38 23.0938C38 18.125 33.875 14 29 14Z" fill="#002F87"/></svg>';
      btnExpandir.title = "Ver todo el contenido en pantalla completa";
      btnExpandir.setAttribute("aria-label", "Ver todo el contenido en pantalla completa");

      const modalLabel = (fieldDef ? fieldDef.nombre.toUpperCase() : "PROCESO DEVOLUCIÓN") + " [" + code + "]";
      btnExpandir.addEventListener("click", function() {
        const modal = document.createElement("div");
        modal.style.position = "fixed";
        modal.style.top = "0";
        modal.style.left = "0";
        modal.style.width = "100%";
        modal.style.height = "100%";
        modal.style.backgroundColor = "rgba(0,0,0,0.5)";
        modal.style.display = "flex";
        modal.style.alignItems = "center";
        modal.style.justifyContent = "center";
        modal.style.zIndex = "99999";

        const box = document.createElement("div");
        box.style.backgroundColor = "white";
        box.style.borderRadius = "10px";
        box.style.padding = "2rem";
        box.style.maxWidth = "800px";
        box.style.width = "90%";
        box.style.maxHeight = "90vh";
        box.style.display = "flex";
        box.style.flexDirection = "column";
        box.style.boxShadow = "0 20px 25px rgba(0,0,0,0.15)";

        const titleEl = document.createElement("h3");
        titleEl.textContent = modalLabel;
        titleEl.style.marginTop = "0";
        titleEl.style.marginBottom = "1rem";
        titleEl.style.color = "#003D53";
        box.appendChild(titleEl);

        const textArea = document.createElement("textarea");
        textArea.value = textarea.value;
        textArea.style.width = "100%";
        textArea.style.minHeight = "300px";
        textArea.style.maxHeight = "70vh";
        textArea.style.padding = "1rem";
        textArea.style.border = "1px solid #ddd";
        textArea.style.borderRadius = "6px";
        textArea.style.fontFamily = "monospace";
        textArea.style.fontSize = "0.95rem";
        textArea.style.resize = "vertical";
        textArea.style.marginBottom = "1rem";
        textArea.style.boxSizing = "border-box";
        textArea.style.overflow = "hidden";
        if (!isEditable) textArea.readOnly = true;
        box.appendChild(textArea);

        const expandTextarea = function() {
          textArea.style.height = "auto";
          const newHeight = Math.min(textArea.scrollHeight, window.innerHeight * 0.7);
          textArea.style.height = newHeight + "px";
        };

        const info = document.createElement("div");
        info.style.fontSize = "0.9rem";
        info.style.color = "#666";
        info.style.marginBottom = "1rem";
        const updateCount = function() {
          info.textContent = "Caracteres: " + textArea.value.length + " | Líneas: " + textArea.value.split('\n').length;
        };
        updateCount();
        textArea.addEventListener("input", function() { updateCount(); expandTextarea(); });
        setTimeout(expandTextarea, 0);
        box.appendChild(info);

        const footer = document.createElement("div");
        footer.style.display = "flex";
        footer.style.gap = "1rem";
        footer.style.justifyContent = "flex-end";

        if (isEditable) {
          const btnGuardar = document.createElement("button");
          btnGuardar.textContent = "Guardar cambios";
          btnGuardar.style.padding = "0.625rem 1.5rem";
          btnGuardar.style.backgroundColor = "#0069A7";
          btnGuardar.style.color = "white";
          btnGuardar.style.border = "none";
          btnGuardar.style.borderRadius = "6px";
          btnGuardar.style.cursor = "pointer";
          btnGuardar.style.fontWeight = "600";
          btnGuardar.addEventListener("click", function() {
            textarea.value = textArea.value;
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
            textarea.dispatchEvent(new Event("change", { bubbles: true }));
            modal.remove();
          });
          footer.appendChild(btnGuardar);
        }

        const btnCerrar = document.createElement("button");
        btnCerrar.textContent = "Cerrar";
        btnCerrar.style.padding = "0.625rem 1.5rem";
        btnCerrar.style.backgroundColor = "#DBDBDB";
        btnCerrar.style.color = "#212121";
        btnCerrar.style.border = "none";
        btnCerrar.style.borderRadius = "6px";
        btnCerrar.style.cursor = "pointer";
        btnCerrar.style.fontWeight = "600";
        btnCerrar.addEventListener("click", function() { modal.remove(); });
        footer.appendChild(btnCerrar);

        box.appendChild(footer);
        modal.appendChild(box);
        document.body.appendChild(modal);
        textArea.focus();
      });

      taContainer.appendChild(textarea);
      taContainer.appendChild(btnExpandir);
      grp.appendChild(taContainer);
    } else {
      const inp = document.createElement("input");
      inp.type = inputType === "date" ? "date" : "text";
      inp.id = "field_" + code;
      inp.name = "field_" + code;
      inp.dataset.fieldCode = code;
      if (!isEditable) { inp.readOnly = true; inp.style.background = "#f0f4fa"; }
      if (existingCampos && existingCampos[code]) inp.value = existingCampos[code];
      grp.appendChild(inp);
    }
    return grp;
  }

  function _makeDevRow(idx, existingCampos, isEditable) {
    const def = _DEV_DEF[idx];
    const row = document.createElement("div");
    row.className = "cuota-row dev-row";
    row.dataset.devIdx = idx;
    const rowHeader = document.createElement("div");
    rowHeader.className = "cuota-row-header";
    const lbl = document.createElement("span");
    lbl.className = "cuota-row-label";
    lbl.textContent = "Devolución " + def.n;
    rowHeader.appendChild(lbl);
    if (isEditable && idx > 0) {
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn-remove-cuota btn-remove-dev";
      removeBtn.textContent = "✕ Eliminar";
      removeBtn.style.display = "none";
      removeBtn.addEventListener("click", function() {
        [def.proceso, def.fecha, def.tipo, def.responsable, def.caso].forEach(function(c) {
          _clearedCuotaCodes.add(c);
        });
        const list = row.closest(".dev-list");
        row.remove();
        _devRefreshRemoveBtns(list);
      });
      rowHeader.appendChild(removeBtn);
    }
    row.appendChild(rowHeader);
    const wrap = document.createElement("div");
    wrap.className = "cuota-row-fields";
    wrap.appendChild(_makeDevField(def.proceso, existingCampos, isEditable, "textarea"));
    wrap.appendChild(_makeDevField(def.fecha,   existingCampos, isEditable, "date"));
    wrap.appendChild(_makeDevField(def.tipo,    existingCampos, isEditable, "select"));
    wrap.appendChild(_makeDevField(def.responsable, existingCampos, isEditable, "select"));
    wrap.appendChild(_makeDevField(def.caso,    existingCampos, isEditable, "select"));
    row.appendChild(wrap);
    return row;
  }

  function _buildDevolucionesWidget(existingCampos, isEditable) {
    const widget = document.createElement("div");
    widget.className = "cuotas-widget dev-widget";
    const header = document.createElement("div");
    header.className = "cuotas-widget-header";
    const title = document.createElement("span");
    title.className = "cuotas-widget-title";
    title.textContent = "DEVOLUCIONES / RETROALIMENTACIONES";
    header.appendChild(title);
    widget.appendChild(header);
    if (isEditable) {
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "btn-add-cuota";
      addBtn.textContent = "+ Agregar devolución";
      header.appendChild(addBtn);
      addBtn.addEventListener("click", function() {
        const list = widget.querySelector(".dev-list");
        const rows = list.querySelectorAll(".dev-row");
        if (rows.length >= _MAX_DEV) {
          showToast("Máximo " + _MAX_DEV + " devoluciones permitidas.", "error");
          return;
        }
        const newIdx = rows.length;
        [_DEV_DEF[newIdx].proceso, _DEV_DEF[newIdx].fecha, _DEV_DEF[newIdx].tipo,
         _DEV_DEF[newIdx].responsable, _DEV_DEF[newIdx].caso].forEach(function(c) {
          _clearedCuotaCodes.delete(c);
        });
        list.appendChild(_makeDevRow(newIdx, {}, true));
        _devRefreshRemoveBtns(list);
      });
    }
    const list = document.createElement("div");
    list.className = "dev-list cuotas-list";
    let initialRows = 1;
    if (existingCampos) {
      for (let i = _MAX_DEV - 1; i >= 0; i--) {
        const d = _DEV_DEF[i];
        if (existingCampos[d.proceso] || existingCampos[d.fecha] || existingCampos[d.tipo] ||
            existingCampos[d.responsable] || existingCampos[d.caso]) {
          initialRows = i + 1; break;
        }
      }
    }
    for (let i = 0; i < initialRows; i++) {
      list.appendChild(_makeDevRow(i, existingCampos, isEditable));
    }
    widget.appendChild(list);
    if (isEditable) _devRefreshRemoveBtns(list);
    return widget;
  }

  function _validateDevolucionesWidget() {
    const widget = dynamicForm.querySelector(".dev-widget");
    if (!widget) return true;
    const rows = Array.prototype.slice.call(widget.querySelectorAll(".dev-row"));
    if (!rows.length) return true;
    const groups = rows.map(function(row, i) {
      const def = _DEV_DEF[i];
      const get = function(code) {
        const el = row.querySelector("[data-field-code='" + code + "']");
        return el ? (el.value || "").trim() : "";
      };
      const vals = [get(def.proceso), get(def.fecha), get(def.tipo), get(def.responsable), get(def.caso)];
      const filled = vals.filter(function(v) { return v !== ""; }).length;
      return { n: i + 1, filled: filled, empty: filled === 0, complete: filled === 5, fecha: vals[1] };
    });
    // Regla 2: todos los campos del grupo o ninguno
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      if (!g.empty && !g.complete) {
        showToast("Devolución " + g.n + ": debe completar todos los campos o dejarlos todos vacíos.", "error");
        return false;
      }
    }
    // Regla 5.2: deben completarse en orden (sin vacíos entre llenos)
    let foundEmpty = false;
    for (let i = 0; i < groups.length; i++) {
      if (foundEmpty && !groups[i].empty) {
        showToast("Las devoluciones deben completarse en orden. La Devolución " + groups[i].n + " no puede estar llena si hay una anterior vacía.", "error");
        return false;
      }
      if (groups[i].empty) foundEmpty = true;
    }
    // Regla 4: fechas en orden ascendente
    const conFecha = groups.filter(function(g) { return !g.empty && g.fecha; });
    for (let i = 1; i < conFecha.length; i++) {
      if (conFecha[i].fecha <= conFecha[i - 1].fecha) {
        showToast("La fecha de Devolución " + conFecha[i].n + " debe ser mayor que la fecha de Devolución " + conFecha[i - 1].n + ".", "error");
        return false;
      }
    }
    return true;
  }

  // ────────────────────────────────────────────────────────────────────────────

  // Renderiza una lista de campos saltando los de cuotas e inyectando el widget en su lugar
  // cuotaMode: "g2only" | "cronly" | "none" | "all" (default)
  function _renderFieldsWithCuotas(container, fields, existingCampos, isEditable, cuotaMode) {
    if (cuotaMode === undefined) cuotaMode = "all";
    let g2Injected = false;
    let crInjected = false;
    let devInjected = false;
    for (const field of fields) {
      if (_CUOTA_G2_SET.has(field.codigo)) {
        if (!g2Injected && cuotaMode !== "cronly" && cuotaMode !== "none") {
          container.appendChild(_buildCuotasWidget(existingCampos, isEditable, "g2"));
          g2Injected = true;
        }
        continue;
      }
      if (_CUOTA_CR_SET.has(field.codigo)) {
        if (!crInjected && cuotaMode !== "g2only" && cuotaMode !== "none") {
          container.appendChild(_buildCuotasWidget(existingCampos, isEditable, "contralor"));
          crInjected = true;
        }
        continue;
      }
      if (_DEV_SET.has(field.codigo)) {
        if (!devInjected && cuotaMode !== "g2only" && cuotaMode !== "none") {
          container.appendChild(_buildDevolucionesWidget(existingCampos, isEditable));
          devInjected = true;
        }
        continue;
      }
      // DT: solo visible si ya tiene valor guardado (histórico); nunca en formularios nuevos
      if (field.codigo === "DT" && !existingCampos?.[field.codigo]) continue;
      container.appendChild(createFieldGroup(field, existingCampos?.[field.codigo] ?? null, isEditable));
    }
  }

  // ---------------------------------------------------------------
  // FORM: Crear grupo de campo individual
  // ---------------------------------------------------------------
  function createFieldGroup(field, prefilledValue, sectionEditable) {
    const group = document.createElement("div");
    group.className = "field-group";
    // sectionEditable=false fuerza el campo como solo lectura aunque su modo sea MANUAL
    const isEditable = sectionEditable === false ? false : field.modo === "MANUAL";
    const fieldId = `field_${field.codigo}`;

    // Label → solo el nombre del campo (fondo oscuro — estilo TH)
    const label = document.createElement("label");
    label.setAttribute("for", fieldId);
    label.textContent = field.nombre;
    group.appendChild(label);

    // Meta → código y badge de modo (fila separada debajo del nombre)
    const meta = document.createElement("div");
    meta.className = "field-meta";
    meta.innerHTML =
      `<span class="field-code">[${escapeHtml(field.codigo)}]</span>` +
      `<span class="badge ${isEditable ? "badge-manual" : "badge-auto"}">${isEditable ? "Editable" : "Autom\u00e1tico"}</span>`;
    group.appendChild(meta);

    const input = createInput(field, fieldId, isEditable);
    // Si createInput devuelve un contenedor (ej: AF con textarea+botón), el elemento
    // real de entrada es el textarea/input interno, no el div.
    const inputEl = (input.tagName === "DIV")
      ? (input.querySelector("textarea, input") || input)
      : input;
    inputEl.dataset.tipoDato  = (field.tipo_dato || "").toLowerCase();
    inputEl.dataset.fieldModo = field.modo || "";
    // Guardar fórmula en el DOM para que recalcFormulas pueda iterar todos los campos
    // AUTOMATICA formulados sin depender de currentFields (que solo cubre el rol activo).
    if (field.modo === "AUTOMATICA" && field.formula) inputEl.dataset.fieldFormula = field.formula;
    if (prefilledValue != null) {
      if (inputEl.dataset.percentAuto === "true") {
        inputEl.dataset.rawValue = String(prefilledValue);
        inputEl.value = _formatPercent(prefilledValue);
      } else {
        inputEl.value = prefilledValue;
        // Auto-expandir si es textarea
        if (inputEl.tagName === "TEXTAREA") {
          setTimeout(() => {
            inputEl.style.height = "auto";
            inputEl.style.height = Math.min(inputEl.scrollHeight, 150) + "px";
          }, 0);
        }
        // Si es un select y el valor histórico ya no existe en la lista actual,
        // inyectarlo como opción para preservar el dato sin modificarlo.
        if (inputEl.tagName === "SELECT" && String(prefilledValue) !== "" && inputEl.value !== String(prefilledValue)) {
          const legacyOpt = document.createElement("option");
          legacyOpt.value = prefilledValue;
          legacyOpt.textContent = prefilledValue;
          legacyOpt.title = "Valor histórico (opción eliminada de la lista)";
          legacyOpt.style.fontStyle = "italic";
          legacyOpt.style.color = "#888";
          // Insertar justo después del "-- Seleccione --"
          inputEl.insertBefore(legacyOpt, inputEl.options[1] || null);
          inputEl.value = prefilledValue;
        }
      }
    } else if (field.codigo === "AC" || field.codigo === "CE") {
      inputEl.value = "EN TRAMITE";
    }

    // Event listener para recalcular fórmulas cuando cambia un campo MANUAL
    if (isEditable) {
      const triggerRecalc = () => recalcFormulas(field.codigo, _currentPrestData);

      // Campo E (NIT PRESTADOR): auto-fill desde BD_PRESTADORES
      if (field.codigo === "E") {
        let _nitTimer = null;
        input.addEventListener("input", () => {
          clearTimeout(_nitTimer);
          _nitTimer = setTimeout(async () => {
            const nit = input.value.trim();
            const _clearPrestDependents = () => {
              ["F", "H", "I"].forEach(code => {
                const el = document.querySelector(`[data-field-code="${code}"]`);
                if (el) el.value = "";
              });
            };
            if (!nit) { _currentPrestData = null; _clearPrestDependents(); recalcFormulas("E", null); return; }
            try {
              const res = await fetch(`/api/prestador_por_nit?nit=${encodeURIComponent(nit)}`);
              if (res.ok) {
                _currentPrestData = await res.json();
                // Auto-fill campos que dependen del NIT (origen: E)
                const autoFillMap = {
                  "H": _currentPrestData.tipo_persona,
                  "I": _currentPrestData.nombre_sucursal,
                  "F": _currentPrestData.ciudad,
                };
                for (const [code, val] of Object.entries(autoFillMap)) {
                  const el = document.querySelector(`[data-field-code="${code}"]`);
                  if (!el || !val) continue;
                  if (el.tagName === "SELECT") {
                    const valNorm = val.trim().toUpperCase();
                    let matched = Array.from(el.options).find(o => o.value === val);
                    if (!matched) matched = Array.from(el.options).find(o => o.value.trim().toUpperCase() === valNorm);
                    if (matched) {
                      el.value = matched.value;
                    } else {
                      const opt = document.createElement("option");
                      opt.value = val;
                      opt.textContent = val;
                      el.appendChild(opt);
                      el.value = val;
                    }
                  } else {
                    el.value = val;
                  }
                }
                recalcFormulas("E", _currentPrestData);
                _checkRegionalNitMismatch(_currentPrestData.regional);
              } else {
                _currentPrestData = null;
                _clearPrestDependents();
                recalcFormulas("E", null);
              }
            } catch { _currentPrestData = null; _clearPrestDependents(); }
          }, 400);
        });
      } else {
        inputEl.addEventListener("change", triggerRecalc);
        inputEl.addEventListener("input",  triggerRecalc);
      }
    }

    // Wrapper para posicionar el ícono de restauración
    const inputWrap = document.createElement("div");
    inputWrap.className = "field-input-wrap";
    inputWrap.appendChild(input);

    if (isEditable) {
      const restoreBtn = document.createElement("button");
      restoreBtn.type = "button";
      restoreBtn.className = "field-restore-btn";
      restoreBtn.title = "Restaurar al último guardado";
      restoreBtn.innerHTML = "&#x21BA;";
      restoreBtn.addEventListener("click", () => {
        const orig = _originalCampos[field.codigo];
        const origStr = orig != null ? String(orig) : "";
        if (inputEl.dataset.percentAuto === "true") {
          inputEl.dataset.rawValue = origStr;
          inputEl.value = origStr !== "" ? _formatPercent(origStr) : "";
        } else if (inputEl.dataset.currency === "true") {
          inputEl.dataset.rawValue = origStr;
          inputEl.value = origStr !== "" ? _formatCurrencyDisplay(origStr) : "";
        } else {
          inputEl.value = origStr;
        }
        inputEl.dataset.originalValue = origStr;
        _updateFieldRestoreIcon(inputEl);
        inputEl.dispatchEvent(new Event("change", { bubbles: true }));
      });
      inputWrap.appendChild(restoreBtn);

      // Guardar valor original y monitorear cambios
      const storeOriginal = () => {
        const orig = _originalCampos[field.codigo];
        inputEl.dataset.originalValue = orig != null ? String(orig) : "";
      };
      // Se llama al terminar el render cuando _originalCampos ya está poblado
      setTimeout(storeOriginal, 0);

      const checkDirty = () => _updateFieldRestoreIcon(inputEl);
      inputEl.addEventListener("change", checkDirty);
      inputEl.addEventListener("input",  checkDirty);
    }

    group.appendChild(inputWrap);
    return group;
  }

  function _updateFieldRestoreIcon(input) {
    const wrap = input.closest(".field-input-wrap");
    if (!wrap) return;
    const btn = wrap.querySelector(".field-restore-btn");
    if (!btn) return;
    const orig = input.dataset.originalValue ?? "";
    let current;
    if (input.dataset.currency === "true") {
      current = input.dataset.rawValue ?? input.value ?? "";
    } else if (input.dataset.percentAuto === "true") {
      current = input.dataset.rawValue ?? input.value ?? "";
    } else {
      current = input.value ?? "";
    }
    const isDirty = String(current) !== String(orig);
    btn.classList.toggle("visible", isDirty);
  }

  // ---------------------------------------------------------------
  // FORM: Render campos del rol (modo creación, sin secciones)
  // ---------------------------------------------------------------
  // STATUS CARDS — tarjetas de estado/comunicado en la vista de edición
  // ---------------------------------------------------------------
  const _SC_ICONS = {
    check:  'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z',
    clock:  'M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z',
    xmark:  'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z',
    lock:   'M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z',
    shield: 'M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z',
    ban:    'M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z',
  };

  /**
   * Construye una tarjeta de estado (CardResultadoIndice).
   * @param {object} opts
   * @param {'optimo'|'prevencion'|'alerta'|'neutro'} opts.variant
   * @param {string}   opts.icon      - clave de _SC_ICONS
   * @param {string}   opts.count     - número/texto en la cajita izquierda
   * @param {string}   opts.title     - título en negrita azul
   * @param {string}   opts.desc      - descripción del estado
   * @param {Function} [opts.onAction] - callback del botón "+"; si no hay, el botón se oculta
   */
  function _buildStatusCard({ variant, icon, count, title, desc, onAction }) {
    const card = document.createElement("div");
    card.className = `status-card status-card--${variant}`;

    const left = document.createElement("div");
    left.className = "status-card__left";
    left.innerHTML = `<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="${_SC_ICONS[icon] || _SC_ICONS.check}" clip-rule="evenodd"/></svg>
      <span class="status-card__count">${escapeHtml(String(count))}</span>`;

    const content = document.createElement("div");
    content.className = "status-card__content";

    const titleEl = document.createElement("p");
    titleEl.className = "status-card__title";
    titleEl.textContent = title;

    const bodyRow = document.createElement("div");
    bodyRow.className = "status-card__body-row";

    const descEl = document.createElement("p");
    descEl.className = "status-card__desc";
    descEl.textContent = desc;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "status-card__btn";
    btn.textContent = "+";
    if (onAction) {
      btn.addEventListener("click", onAction);
    } else {
      btn.hidden = true;
    }

    bodyRow.appendChild(descEl);
    bodyRow.appendChild(btn);
    content.appendChild(titleEl);
    content.appendChild(bodyRow);
    card.appendChild(left);
    card.appendChild(content);
    return card;
  }

  // ---------------------------------------------------------------
  function renderForm(fields) {
    _currentPrestData = null;  // reset prestador al abrir formulario nuevo
    _clearedCuotaCodes = new Set();
    dynamicForm.innerHTML = "";
    const _createCuotaMode = currentRole === "CONTRALOR" ? "cronly" : "g2only";
    _renderFieldsWithCuotas(dynamicForm, fields, {}, true, _createCuotaMode);
  }

  // ---------------------------------------------------------------
  // FORM: Render con secciones desplegables por rol inferior
  // ---------------------------------------------------------------
  async function renderFormWithSections(existingCampos, gestor1Only = false, opts = {}) {
    const {
      gestor1Editable   = true,   // ¿la sección GESTOR 1 es editable cuando gestor1Only?
      showValidar       = false,  // ¿mostrar botón "Validar"?
      ownSectionReadonly = false, // ¿la sección propia es solo lectura? (post-validación G1)
      validadoInfo      = null,   // { validado, fecha, por }
    } = opts;

    dynamicForm.innerHTML = "";
    _clearedCuotaCodes = new Set();

    // Limpiar tarjetas de estado previas y panel de historial N
    if (formCardsContainer) formCardsContainer.innerHTML = "";
    const _oldPanel = $("n-historial-panel");
    if (_oldPanel) _oldPanel.remove();

    // Tarjeta de estado de validación
    if (validadoInfo) {
      const { validado, fecha, por } = validadoInfo;
      if (validado) {
        const fechaFmt = fecha ? new Date(fecha).toLocaleString("es-CO", {
          dateStyle: "short", timeStyle: "short"
        }) : "—";
        if (formCardsContainer) formCardsContainer.appendChild(_buildStatusCard({
          variant: "optimo", icon: "check", count: "✓",
          title: "Validado",
          desc: `Por ${por || "—"} el ${fechaFmt}`,
        }));
      } else if (showValidar) {
        if (formCardsContainer) formCardsContainer.appendChild(_buildStatusCard({
          variant: "prevencion", icon: "clock", count: "!",
          title: "Pendiente de validación",
          desc: "Revise los campos de Gestor 1 y presione \"✔ Validar Registro\" para guardar y validar.",
        }));
      }
    }

    // Determinar qué roles inferiores mostrar usando la jerarquía fija
    const _isLiderCtrlRender = sessionPermisos.includes("LIDER") || sessionPermisos.includes("CONTRALOR") || sessionIsAdmin;
    // LIDER con acceso extendido: ver también sección CONTRALOR
    const _liderExtRender = currentRole === "LIDER" && _liderTieneAccesoContralor(existingCampos);
    const lowerRoles = ROLE_LOWER_ROLES[currentRole] || [];

    // Secciones de roles inferiores (colapsadas)
    if (lowerRoles.length > 0 || _liderExtRender) {
      let secciones = [];
      if (lowerRoles.length > 0) {
        const res = await fetch(`/api/campos-secciones/${encodeURIComponent(currentRole)}`);
        secciones = await res.json();
      }
      // Si gestor1Only: mostrar únicamente la sección GESTOR 1
      if (gestor1Only) secciones = secciones.filter(s => s.rol === "GESTOR 1");

      for (const sec of secciones) {
        const meta = ROL_META[sec.rol] || { color: "#555", bg: "#f5f5f5", label: sec.rol };
        // Excluir campos de cuotas del conteo de "campos con datos" para las secciones inferiores
        const filledCount = sec.fields.filter(f => !_ALL_CUOTA_SET.has(f.codigo) && !_DEV_SET.has(f.codigo) && existingCampos[f.codigo] != null).length;

        const details = document.createElement("details");
        details.className = "role-section";

        const summary = document.createElement("summary");
        summary.className = "role-section-summary";
        summary.style.setProperty("--rol-color", meta.color);
        summary.style.setProperty("--rol-bg", meta.bg);
        summary.innerHTML = `
          <span class="role-section-chevron">▶</span>
          <span class="role-section-badge" style="background:${meta.bg};color:${meta.color}">${meta.label}</span>
          <span class="role-section-title">${sec.rol}</span>
          <span class="role-section-stats">${sec.fields.length} campos · <strong>${filledCount}</strong> con datos</span>`;
        details.appendChild(summary);

        const body = document.createElement("div");
        body.className = "role-section-body";
        // Editable si: líder/contralor/admin, o gestor1Only con gestor1Editable=true
        const lowerSecEditable = _isLiderCtrlRender || (gestor1Only && gestor1Editable !== false);
        if (gestor1Only) details.open = true;
        const _lowerCuotaMode = sec.rol === "GESTOR 2 / LIDER" ? "g2only" : sec.rol === "CONTRALOR" ? "cronly" : "none";
        _renderFieldsWithCuotas(body, sec.fields, existingCampos, lowerSecEditable, _lowerCuotaMode);
        details.appendChild(body);
        dynamicForm.appendChild(details);
      }
    }

    // Si gestor1Only y el rol actual no es GESTOR 1 → no mostrar la sección propia
    if (gestor1Only && currentRole !== "GESTOR 1") return;

    // Sección principal: campos del rol actual (colapsable, abierta por defecto)
    const meta = ROL_META[currentRole] || { color: "#333", bg: "#f5f5f5", label: currentRole };
    const mainSection = document.createElement("details");
    mainSection.className = "role-section current-role-section";
    mainSection.open = true;

    const mainSummary = document.createElement("summary");
    mainSummary.className = "role-section-summary";
    mainSummary.style.setProperty("--rol-color", meta.color);
    mainSummary.style.setProperty("--rol-bg", meta.bg);
    mainSummary.innerHTML = `
      <span class="role-section-chevron">▶</span>
      <span class="role-section-badge" style="background:${meta.bg};color:${meta.color}">${meta.label}</span>
      <span class="role-section-title">${currentRole} — Sus campos</span>
      <span class="role-section-stats">${currentFields.length} campos</span>`;
    mainSection.appendChild(mainSummary);

    const mainBody = document.createElement("div");
    mainBody.className = "role-section-body";
    // Editable salvo que la sección propia esté bloqueada post-validación
    const _mainCuotaMode = currentRole === "CONTRALOR" ? "cronly" : "g2only";
    _renderFieldsWithCuotas(mainBody, currentFields, existingCampos, !ownSectionReadonly, _mainCuotaMode);
    mainSection.appendChild(mainBody);
    dynamicForm.appendChild(mainSection);

    // LIDER con acceso extendido: sección CONTRALOR AL FINAL (después de la sección propia)
    if (_liderExtRender && !gestor1Only) {
      try {
        const resCtr = await fetch(`${BASE}/api/campos/CONTRALOR`);
        if (resCtr.ok) {
          const _liderCodes = new Set(currentFields.map(f => f.codigo));
          // Excluir campos que ya aparecen en la sección propia del LIDER (rol compartido)
          const ctrFields = (await resCtr.json()).filter(f => !_liderCodes.has(f.codigo));
          if (ctrFields && ctrFields.length > 0) {
            const metaCtr = ROL_META["CONTRALOR"] || { color: "#555", bg: "#f5f5f5", label: "CONTRALOR" };
            const filledCtr = ctrFields.filter(f => !_ALL_CUOTA_SET.has(f.codigo) && !_DEV_SET.has(f.codigo) && existingCampos[f.codigo] != null).length;
            const detailsCtr = document.createElement("details");
            detailsCtr.className = "role-section";
            const summaryCtr = document.createElement("summary");
            summaryCtr.className = "role-section-summary";
            summaryCtr.style.setProperty("--rol-color", metaCtr.color);
            summaryCtr.style.setProperty("--rol-bg", metaCtr.bg);
            summaryCtr.innerHTML = `
              <span class="role-section-chevron">▶</span>
              <span class="role-section-badge" style="background:${metaCtr.bg};color:${metaCtr.color}">${metaCtr.label}</span>
              <span class="role-section-title">CONTRALOR</span>
              <span class="role-section-stats">${ctrFields.length} campos · <strong>${filledCtr}</strong> con datos</span>`;
            detailsCtr.appendChild(summaryCtr);
            const bodyCtr = document.createElement("div");
            bodyCtr.className = "role-section-body";
            _renderFieldsWithCuotas(bodyCtr, ctrFields, existingCampos, true, "cronly");
            detailsCtr.appendChild(bodyCtr);
            dynamicForm.appendChild(detailsCtr);
          }
        }
      } catch { /* ignorar */ }
    }
  }

  // ---------------------------------------------------------------
  // VALIDACIÓN DE REGISTRO: acción
  // ---------------------------------------------------------------
  async function _validarRegistro(id) {
    if (!id) return;
    const ok = confirm(
      "¿Confirma que los datos de la sección Gestor 1 son correctos?\n\n" +
      "Una vez validado, la sección quedará bloqueada para edición (solo líder o contralor podrán modificarla)."
    );
    if (!ok) return;
    try {
      const res  = await fetch(`${BASE}/api/registro/${id}/validar`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) { showToast(body.detail || "Error al validar.", "error"); return; }
      showToast("✅ Registro validado correctamente.", "success");
      // LIDER: volver a la lista (ya puede editar el registro desde "Registros")
      // GESTOR: quedarse en el formulario con el nuevo estado
      const _isLiderValidando = sessionPermisos.includes("LIDER") && !sessionIsAdmin;
      if (_isLiderValidando) {
        await loadMainRecords();
        showSection(mainSection);
        currentEditId = null;
      } else {
        const metaRec = allMainRecords.find(r => r.id === id) || { id };
        await openEditForm(id, metaRec);
      }
    } catch { showToast("Error de conexión al validar.", "error"); }
  }

  function _protectAGField(validado, isCreatedByMe, assignedToMe, isLiderCtrl) {
    if (isLiderCtrl) return; // líder/contralor siempre pueden cambiar AG
    const agEl = document.getElementById("field-AG");
    if (!agEl) return;
    // Bloquear si soy el gestor asignado (nunca puede editar AG)
    // o si el registro ya fue validado (solo líder/contralor pueden)
    const block = assignedToMe || validado;
    if (block) {
      agEl.disabled = true;
      agEl.style.pointerEvents = "none";
      agEl.title = validado
        ? "Tras la validación, solo el líder o contralor puede cambiar el Responsable de Conciliación."
        : "El gestor asignado no puede modificar el Responsable de Conciliación.";
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function createInput(field, fieldId, isEditable) {
    const tipo = (field.tipo_dato || "Texto").toLowerCase();
    // Campos AUTOMATICA: visibles y readonly (no disabled) para que se puedan calcular y enviar
    const isAuto = field.modo === "AUTOMATICA";

    if (field.opciones && field.opciones.length > 0) {
      const select = document.createElement("select");
      select.id = fieldId;
      select.name = fieldId;
      select.dataset.fieldCode = field.codigo;
      select.disabled = !isEditable && !isAuto;
      if (isAuto) { select.style.pointerEvents = "none"; select.tabIndex = -1; select.style.background = "#f0f4fa"; select.style.color = "#555"; }
      const def = document.createElement("option");
      def.value = "";
      def.textContent = "-- Seleccione --";
      select.appendChild(def);
      for (const opt of field.opciones) {
        const o = document.createElement("option");
        o.value = opt;
        o.textContent = opt;
        select.appendChild(o);
      }
      return select;
    }

    if (tipo === "fecha") {
      const input = document.createElement("input");
      input.type = "date";
      input.id = fieldId;
      input.name = fieldId;
      input.dataset.fieldCode = field.codigo;
      input.disabled = !isEditable && !isAuto;
      if (isAuto) { input.readOnly = true; input.style.pointerEvents = "none"; input.tabIndex = -1; input.style.background = "#f0f4fa"; }
      return input;
    }

    if (tipo === "moneda") {
      const input = document.createElement("input");
      input.type = "text";
      input.inputMode = "decimal";
      input.id = fieldId;
      input.name = fieldId;
      input.dataset.fieldCode = field.codigo;
      input.dataset.currency = "true";
      input.disabled = !isEditable && !isAuto;
      if (isAuto) { input.readOnly = true; input.style.pointerEvents = "none"; input.tabIndex = -1; input.style.background = "#f0f4fa"; input.style.color = "#555"; }
      input.placeholder = "$ 0";
      return input;
    }

    if (tipo === "porcentaje" && isAuto) {
      // Campo porcentaje automático: readonly text, muestra el decimal como XX%
      const input = document.createElement("input");
      input.type = "text"; input.id = fieldId; input.name = fieldId;
      input.dataset.fieldCode = field.codigo;
      input.dataset.percentAuto = "true";
      input.readOnly = true;
      input.style.pointerEvents = "none"; input.tabIndex = -1;
      input.style.background = "#f0f4fa"; input.style.color = "#555";
      return input;
    }

    if (tipo === "entero" || tipo === "porcentaje") {
      const input = document.createElement("input");
      input.type = "number";
      input.id = fieldId;
      input.name = fieldId;
      input.dataset.fieldCode = field.codigo;
      input.disabled = !isEditable && !isAuto;
      if (isAuto) { input.readOnly = true; input.style.pointerEvents = "none"; input.tabIndex = -1; input.style.background = "#f0f4fa"; input.style.color = "#555"; }
      if (tipo === "porcentaje") { input.step = "0.01"; input.min = "0"; input.max = "100"; input.placeholder = "0 - 100%"; }
      else { input.step = "1"; }
      return input;
    }

    if (tipo === "binario") {
      // Campos automáticos binarios (calculados por fórmula): input readonly — no select
      if (isAuto) {
        const input = document.createElement("input");
        input.type = "text"; input.id = fieldId; input.name = fieldId;
        input.dataset.fieldCode = field.codigo;
        input.readOnly = true; input.style.pointerEvents = "none"; input.tabIndex = -1;
        input.style.background = "#f0f4fa"; input.style.color = "#555";
        return input;
      }
      const select = document.createElement("select");
      select.id = fieldId;
      select.name = fieldId;
      select.dataset.fieldCode = field.codigo;
      select.disabled = !isEditable;
      for (const val of ["-- Seleccione --", "SI", "NO"]) {
        const o = document.createElement("option");
        o.value = val === "-- Seleccione --" ? "" : val;
        o.textContent = val;
        select.appendChild(o);
      }
      return select;
    }

    // Campos de texto largo: usar textarea para mejor visibilidad
    if (field.codigo === "AF") {
      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.gap = "0.75rem";
      container.style.alignItems = "flex-end";
      container.style.width = "100%";

      const textarea = document.createElement("textarea");
      textarea.id = fieldId;
      textarea.name = fieldId;
      textarea.dataset.fieldCode = field.codigo;
      textarea.disabled = !isEditable && !isAuto;
      textarea.style.flex = "1";
      textarea.style.height = "38px";
      textarea.style.minHeight = "38px";
      textarea.style.maxHeight = "150px";
      textarea.style.padding = "0.5rem 0.75rem";
      textarea.style.border = "1px solid #ccc";
      textarea.style.borderRadius = "4px";
      textarea.style.fontFamily = "inherit";
      textarea.style.fontSize = "0.9rem";
      textarea.style.resize = "vertical";
      textarea.style.overflow = "hidden";
      textarea.placeholder = "Escriba aquí...";
      textarea.style.boxSizing = "border-box";

      // Auto-expandir textarea conforme se escribe
      textarea.addEventListener("input", () => {
        textarea.style.height = "auto";
        textarea.style.height = Math.min(textarea.scrollHeight, 300) + "px";
      });

      // Botón para abrir modal con todo el contenido
      const btnExpandir = document.createElement("button");
      btnExpandir.type = "button";
      btnExpandir.style.padding = "0";
      btnExpandir.style.width = "44px";
      btnExpandir.style.height = "44px";
      btnExpandir.style.background = "transparent";
      btnExpandir.style.border = "none";
      btnExpandir.style.cursor = "pointer";
      btnExpandir.style.flexShrink = "0";
      btnExpandir.style.display = "inline-flex";
      btnExpandir.style.alignItems = "center";
      btnExpandir.style.justifyContent = "center";
      btnExpandir.innerHTML = '<svg width="24" height="19" viewBox="0 0 58 46" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M55.625 21.4062C50.5625 9.875 40.4375 2 29 2C17.4688 2 7.34375 9.875 2.28125 21.4062C2.09375 21.875 2 22.5312 2 23C2 23.4688 2.09375 24.2188 2.28125 24.6875C7.34375 36.2188 17.4688 44 29 44C40.4375 44 50.5625 36.2188 55.625 24.6875C55.8125 24.2188 56 23.4688 56 23C56 22.5312 55.8125 21.875 55.625 21.4062ZM42.5 23C42.5 30.5 36.4062 36.5 29 36.5C21.5 36.5 15.5 30.5 15.5 23C15.5 15.5938 21.5 9.5 29 9.5C36.4062 9.5 42.5 15.5938 42.5 23ZM29 14C28.7188 14 28.4375 14.0938 28.1562 14.0938C28.625 14.9375 29 15.9688 29 17C29 20.375 26.2812 23 23 23C21.875 23 20.8438 22.7188 20 22.25C20 22.5312 20 22.8125 20 23C20 27.9688 24.0312 32 29 32C33.9688 32 38 28.0625 38 23.0938C38 18.125 33.875 14 29 14Z" fill="#002F87"/></svg>';
      btnExpandir.title = "Ver todo el contenido en pantalla completa";
      btnExpandir.setAttribute("aria-label", "Ver todo el contenido en pantalla completa");

      btnExpandir.addEventListener("click", () => {
        const modal = document.createElement("div");
        modal.style.position = "fixed";
        modal.style.top = "0";
        modal.style.left = "0";
        modal.style.width = "100%";
        modal.style.height = "100%";
        modal.style.backgroundColor = "rgba(0,0,0,0.5)";
        modal.style.display = "flex";
        modal.style.alignItems = "center";
        modal.style.justifyContent = "center";
        modal.style.zIndex = "99999";

        const box = document.createElement("div");
        box.style.backgroundColor = "white";
        box.style.borderRadius = "10px";
        box.style.padding = "2rem";
        box.style.maxWidth = "800px";
        box.style.width = "90%";
        box.style.maxHeight = "90vh";
        box.style.display = "flex";
        box.style.flexDirection = "column";
        box.style.boxShadow = "0 20px 25px rgba(0,0,0,0.15)";

        const title = document.createElement("h3");
        title.textContent = "OBSERVACIONES ACTUALES [AF]";
        title.style.marginTop = "0";
        title.style.marginBottom = "1rem";
        title.style.color = "#003D53";
        box.appendChild(title);

        const textArea = document.createElement("textarea");
        textArea.value = textarea.value;
        textArea.style.width = "100%";
        textArea.style.minHeight = "300px";
        textArea.style.maxHeight = "70vh";
        textArea.style.padding = "1rem";
        textArea.style.border = "1px solid #ddd";
        textArea.style.borderRadius = "6px";
        textArea.style.fontFamily = "monospace";
        textArea.style.fontSize = "0.95rem";
        textArea.style.resize = "vertical";
        textArea.style.marginBottom = "1rem";
        textArea.style.boxSizing = "border-box";
        textArea.style.overflow = "hidden";
        box.appendChild(textArea);

        // Auto-expandir textarea conforme se escribe
        const expandTextarea = () => {
          textArea.style.height = "auto";
          const newHeight = Math.min(textArea.scrollHeight, window.innerHeight * 0.7);
          textArea.style.height = newHeight + "px";
        };

        const info = document.createElement("div");
        info.style.fontSize = "0.9rem";
        info.style.color = "#666";
        info.style.marginBottom = "1rem";
        const updateCount = () => {
          info.textContent = `Caracteres: ${textArea.value.length} | Líneas: ${textArea.value.split('\n').length}`;
        };
        updateCount();
        textArea.addEventListener("input", () => {
          updateCount();
          expandTextarea();
        });

        // Expandir inmediatamente si hay contenido
        setTimeout(expandTextarea, 0);

        box.appendChild(info);

        const footer = document.createElement("div");
        footer.style.display = "flex";
        footer.style.gap = "1rem";
        footer.style.justifyContent = "flex-end";

        const btnGuardar = document.createElement("button");
        btnGuardar.textContent = "Guardar cambios";
        btnGuardar.style.padding = "0.625rem 1.5rem";
        btnGuardar.style.backgroundColor = "#0069A7";
        btnGuardar.style.color = "white";
        btnGuardar.style.border = "none";
        btnGuardar.style.borderRadius = "6px";
        btnGuardar.style.cursor = "pointer";
        btnGuardar.style.fontWeight = "600";
        btnGuardar.addEventListener("click", () => {
          textarea.value = textArea.value;
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          textarea.dispatchEvent(new Event("change", { bubbles: true }));
          modal.remove();
        });
        footer.appendChild(btnGuardar);

        const btnCerrar = document.createElement("button");
        btnCerrar.textContent = "Cerrar";
        btnCerrar.style.padding = "0.625rem 1.5rem";
        btnCerrar.style.backgroundColor = "#DBDBDB";
        btnCerrar.style.color = "#212121";
        btnCerrar.style.border = "none";
        btnCerrar.style.borderRadius = "6px";
        btnCerrar.style.cursor = "pointer";
        btnCerrar.style.fontWeight = "600";
        btnCerrar.addEventListener("click", () => modal.remove());
        footer.appendChild(btnCerrar);

        box.appendChild(footer);
        modal.appendChild(box);
        document.body.appendChild(modal);
        textArea.focus();
      });

      container.appendChild(textarea);
      container.appendChild(btnExpandir);
      return container;
    }

    const input = document.createElement("input");
    input.type = "text";
    input.id = fieldId;
    input.name = fieldId;
    input.dataset.fieldCode = field.codigo;
    input.disabled = !isEditable && !isAuto;
    if (isAuto) {
      input.readOnly = true; input.style.pointerEvents = "none"; input.tabIndex = -1; input.style.background = "#f0f4fa";
    }
    return input;
  }

  // ---------------------------------------------------------------
  // FORM: Submit
  // ---------------------------------------------------------------
  // Flag para permitir submit tras confirmación de mismatch Regional IPS (B) vs Ciudad Responsable (C)
  let _mismatchConfirmed = false;

  // ---------------------------------------------------------------
  // FORM: Restaurar todos los campos al último guardado
  // ---------------------------------------------------------------
  function _restoreAllFields() {
    dynamicForm.querySelectorAll("[data-field-code]").forEach(el => {
      const code = el.dataset.fieldCode;
      if (!code || el.readOnly || el.disabled) return;
      const orig = _originalCampos[code];
      const origStr = orig != null ? String(orig) : "";
      if (el.dataset.percentAuto === "true") {
        el.dataset.rawValue = origStr;
        el.value = origStr !== "" ? _formatPercent(origStr) : "";
      } else if (el.dataset.currency === "true") {
        el.dataset.rawValue = origStr;
        el.value = origStr !== "" ? _formatCurrencyDisplay(origStr) : "";
      } else {
        el.value = origStr;
      }
      el.dataset.originalValue = origStr;
      _updateFieldRestoreIcon(el);
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    showToast("Campos restaurados al último guardado.", "info");
  }

  btnRestoreAll.addEventListener("click", _restoreAllFields);

  // ---------------------------------------------------------------
  // Bloqueo de formulario por AC = estado de cierre
  // Cuando AC tiene un valor de cierre, deshabilita todos los campos
  // excepto AC (para poder cambiar el estado), CF y CG.
  // Se aplica al confirmar el modal, al cargar un registro y al
  // cambiar AC a un valor de no-cierre (para desbloquear).
  // ---------------------------------------------------------------
  // ---------------------------------------------------------------
  // CF / CG — visibilidad condicional (solo visible al confirmar cierre)
  // ---------------------------------------------------------------
  let _cfcgRevealed = false;

  function _anyLockActive() {
    const acEl = dynamicForm.querySelector('[data-field-code="AC"]');
    const bdEl = dynamicForm.querySelector('[data-field-code="BD"]');
    const ceEl = dynamicForm.querySelector('[data-field-code="CE"]');
    return _AC_CIERRE_VALS_LOCK.includes((acEl?.value || "").trim()) ||
           _BD_CIERRE_VALS_LOCK.includes((bdEl?.value || "").trim()) ||
           _CE_CIERRE_VALS_LOCK.includes((ceEl?.value || "").trim());
  }

  function _setCFCGVisibility(visible, clearValues) {
    for (const code of ["CF", "CG"]) {
      const el = dynamicForm.querySelector(`[data-field-code="${code}"]`);
      if (!el) continue;
      const grp = el.closest(".field-group");
      if (grp) grp.style.display = visible ? "" : "none";
      if (clearValues) {
        el.value = "";
        if (el.dataset) el.dataset.rawValue = "";
        el.classList.remove("field-required-error");
      }
    }
    _cfcgRevealed = visible;
  }

  function _scrollToCFCG() {
    const cfEl = dynamicForm.querySelector('[data-field-code="CF"]');
    const grp = cfEl?.closest(".field-group");
    if (grp) requestAnimationFrame(() => grp.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  const _AC_CIERRE_EXCEPT_LOCK = new Set(["AC", "BD", "CF", "CG"]);
  const _AC_CIERRE_VALS_LOCK = [
    "CERRADO POR CANCELACION DE MESA",
    "CERRADO POR CANCELACION DE MESAS",
    "CERRADO SIN FINALIZACIÓN",
    "IPS NO ASISTE A MESAS"
  ];

  function _applyACCierreLock() {
    const acEl = dynamicForm.querySelector('[data-field-code="AC"]');
    const acVal = acEl ? (acEl.value || "").toString().trim() : "";
    const locked = _AC_CIERRE_VALS_LOCK.includes(acVal);

    // Banner informativo
    const existingBanner = dynamicForm.querySelector(".ac-cierre-lock-banner");
    if (locked && !existingBanner) {
      const banner = document.createElement("div");
      banner.className = "ac-cierre-lock-banner";
      banner.style.cssText = "background:#FEF3C7;border:1px solid #FCD34D;border-radius:6px;padding:.6rem 1rem;margin-bottom:1rem;font-size:.9rem;color:#92400E;";
      banner.innerHTML = "⚠️ <strong>Modo cierre activo (AC):</strong> Solo se pueden editar los campos CF y CG.";
      dynamicForm.prepend(banner);
    } else if (!locked && existingBanner) {
      existingBanner.remove();
    }

    // Bloquear o desbloquear campos
    dynamicForm.querySelectorAll("input[name^='field_'], select[name^='field_'], textarea[name^='field_']").forEach(el => {
      const code = (el.name || "").replace(/^field_/i, "").toUpperCase();
      if (_AC_CIERRE_EXCEPT_LOCK.has(code)) return; // AC, CF, CG: siempre habilitados
      if (locked) {
        if (!el.disabled && !el.readOnly) {
          el.dataset._acCierreLocked = "1";
          el.disabled = true;
          const wrapper = el.closest(".field-row") || el.parentElement;
          if (wrapper) wrapper.style.opacity = "0.5";
        }
      } else {
        if (el.dataset._acCierreLocked === "1") {
          delete el.dataset._acCierreLocked;
          // Solo rehabilitar si el lock de BD tampoco está activo
          if (!el.dataset._bdCierreLocked) {
            el.disabled = false;
            const wrapper = el.closest(".field-row") || el.parentElement;
            if (wrapper) wrapper.style.opacity = "";
          }
        }
      }
    });
  }

  // ---------------------------------------------------------------
  // BD CIERRE LOCK — igual que AC pero para ESTADO FINIQUITO [BD]
  // BD y AC se mantienen siempre habilitados entre sí para permitir
  // cambios de estado independientes.
  // ---------------------------------------------------------------
  const _BD_CIERRE_VALS_LOCK = ["CERRADO SIN FINALIZACION"];
  const _BD_CIERRE_EXCEPT_LOCK = new Set(["AC", "BD", "CF", "CG"]);

  function _applyBDCierreLock() {
    const bdEl = dynamicForm.querySelector('[data-field-code="BD"]');
    const bdVal = bdEl ? (bdEl.value || "").toString().trim() : "";
    const locked = _BD_CIERRE_VALS_LOCK.includes(bdVal);

    // Banner informativo
    const existingBanner = dynamicForm.querySelector(".bd-cierre-lock-banner");
    if (locked && !existingBanner) {
      const banner = document.createElement("div");
      banner.className = "bd-cierre-lock-banner";
      banner.style.cssText = "background:#FEF3C7;border:1px solid #FCD34D;border-radius:6px;padding:.6rem 1rem;margin-bottom:1rem;font-size:.9rem;color:#92400E;";
      banner.innerHTML = "⚠️ <strong>Modo cierre activo (BD):</strong> Solo se pueden editar los campos CF y CG.";
      dynamicForm.prepend(banner);
    } else if (!locked && existingBanner) {
      existingBanner.remove();
    }

    // Bloquear o desbloquear campos
    dynamicForm.querySelectorAll("input[name^='field_'], select[name^='field_'], textarea[name^='field_']").forEach(el => {
      const code = (el.name || "").replace(/^field_/i, "").toUpperCase();
      if (_BD_CIERRE_EXCEPT_LOCK.has(code)) return; // AC, BD, CF, CG: siempre habilitados
      if (locked) {
        if (!el.disabled && !el.readOnly) {
          el.dataset._bdCierreLocked = "1";
          el.disabled = true;
          const wrapper = el.closest(".field-row") || el.parentElement;
          if (wrapper) wrapper.style.opacity = "0.5";
        }
      } else {
        if (el.dataset._bdCierreLocked === "1") {
          delete el.dataset._bdCierreLocked;
          // Solo rehabilitar si el lock de AC tampoco está activo
          if (!el.dataset._acCierreLocked) {
            el.disabled = false;
            const wrapper = el.closest(".field-row") || el.parentElement;
            if (wrapper) wrapper.style.opacity = "";
          }
        }
      }
    });
  }

  // ---------------------------------------------------------------
  // CE CIERRE LOCK — igual que AC/BD pero para ESTADO PROCESO CONCILIACIÓN [CE]
  // CE, AC y BD se mantienen siempre habilitados entre sí.
  // ---------------------------------------------------------------
  const _CE_CIERRE_VALS_LOCK = ["CERRADO POR CANCELACION DE MESAS", "CERRADO SIN FINALIZACIÓN"];
  const _CE_CIERRE_EXCEPT_LOCK = new Set(["AC", "BD", "CE", "CF", "CG"]);

  function _applyCECierreLock() {
    const ceEl = dynamicForm.querySelector('[data-field-code="CE"]');
    const ceVal = ceEl ? (ceEl.value || "").toString().trim() : "";
    const locked = _CE_CIERRE_VALS_LOCK.includes(ceVal);

    // Banner informativo
    const existingBanner = dynamicForm.querySelector(".ce-cierre-lock-banner");
    if (locked && !existingBanner) {
      const banner = document.createElement("div");
      banner.className = "ce-cierre-lock-banner";
      banner.style.cssText = "background:#FEF3C7;border:1px solid #FCD34D;border-radius:6px;padding:.6rem 1rem;margin-bottom:1rem;font-size:.9rem;color:#92400E;";
      banner.innerHTML = "⚠️ <strong>Modo cierre activo (CE):</strong> Solo se pueden editar los campos CF y CG.";
      dynamicForm.prepend(banner);
    } else if (!locked && existingBanner) {
      existingBanner.remove();
    }

    // Bloquear o desbloquear campos
    dynamicForm.querySelectorAll("input[name^='field_'], select[name^='field_'], textarea[name^='field_']").forEach(el => {
      const code = (el.name || "").replace(/^field_/i, "").toUpperCase();
      if (_CE_CIERRE_EXCEPT_LOCK.has(code)) return;
      if (locked) {
        if (!el.disabled && !el.readOnly) {
          el.dataset._ceCierreLocked = "1";
          el.disabled = true;
          const wrapper = el.closest(".field-row") || el.parentElement;
          if (wrapper) wrapper.style.opacity = "0.5";
        }
      } else {
        if (el.dataset._ceCierreLocked === "1") {
          delete el.dataset._ceCierreLocked;
          // Solo rehabilitar si ningún otro lock está activo
          if (!el.dataset._acCierreLocked && !el.dataset._bdCierreLocked) {
            el.disabled = false;
            const wrapper = el.closest(".field-row") || el.parentElement;
            if (wrapper) wrapper.style.opacity = "";
          }
        }
      }
    });
  }

  // ---------------------------------------------------------------
  // CE TRAMITADO LOCK — cuando CE = "TRAMITADO", Gestor 2 y Lider
  // no pueden modificar los campos O-CL. Solo CONTRALOR y Admin.
  // A diferencia de _applyCECierreLock (que aplica para todos), este
  // lock es role-specific y se activa tanto al cargar como al cambiar CE.
  // ---------------------------------------------------------------
  function _applyCETramitadoLock() {
    const ceEl = dynamicForm.querySelector('[data-field-code="CE"]');
    const ceVal = ceEl ? (ceEl.value || "").toString().trim() : "";
    const isTramitado = ceVal === "TRAMITADO";
    const rol = (currentRole || "").trim().toUpperCase();
    const esGestorOLider = (rol.includes("GESTOR 2") || rol === "LIDER") && !sessionIsAdmin;

    // Solo actuar para GESTOR 2 y LIDER
    if (!esGestorOLider) return;

    const _O_CL_CODES = [
      "O","P","Q","R","S","T","U","V","W","X","Y","Z","AA","AB","AC","AD","AE","AF","AG","AH",
      "AI","AJ","AK","AL","AM","AN","AO","AP","AQ","AR","AS","AT","AU","AV","AW","AX","AY","AZ",
      "BA","BB","BC","BD","BE","BF","BG","BH","BI","BJ","BK","BL","BM","BN","BO","BP","BQ","BR",
      "BS","BT","BU","BV","BW","BX","BY","BZ","CA","CB","CC","CD"
    ];

    // Limpiar banner previo
    const existingBanner = dynamicForm.querySelector(".ce-tramitado-lock-banner");
    if (isTramitado && !existingBanner) {
      const banner = document.createElement("div");
      banner.className = "ce-tramitado-lock-banner";
      banner.style.cssText = "background:#FEF3C7;border:1px solid #FCD34D;border-radius:6px;padding:.6rem 1rem;margin-bottom:1rem;font-size:.9rem;color:#92400E;";
      banner.innerHTML = "🔒 <strong>Registro en estado TRAMITADO (CE):</strong> Los campos de la glosa no pueden modificarse. Solo el Contralor o Administración pueden realizar cambios.";
      dynamicForm.prepend(banner);
    } else if (!isTramitado && existingBanner) {
      existingBanner.remove();
    }

    for (const code of _O_CL_CODES) {
      const fieldEl = dynamicForm.querySelector(`[data-field-code="${code}"]`);
      if (!fieldEl) continue;
      if (isTramitado) {
        if (!fieldEl.disabled && !fieldEl.readOnly) {
          fieldEl.dataset._ceTramitadoLocked = "1";
          fieldEl.disabled = true;
          const wrapper = fieldEl.closest(".field-row") || fieldEl.parentElement;
          if (wrapper) wrapper.style.opacity = "0.45";
        }
      } else {
        if (fieldEl.dataset._ceTramitadoLocked === "1") {
          delete fieldEl.dataset._ceTramitadoLocked;
          if (!fieldEl.dataset._ceCierreLocked && !fieldEl.dataset._bdCierreLocked && !fieldEl.dataset._acCierreLocked) {
            fieldEl.disabled = false;
            const wrapper = fieldEl.closest(".field-row") || fieldEl.parentElement;
            if (wrapper) wrapper.style.opacity = "";
          }
        }
      }
    }
  }

  // ---- Botón Reabrir Registro ----
  if (btnReabrir) {
    btnReabrir.addEventListener("click", async () => {
      if (currentEditId === null) return;

      const _esLiderSoloReap = sessionPermisos.includes("LIDER") && !sessionPermisos.includes("CONTRALOR") && !sessionIsAdmin;
      if (_esLiderSoloReap && _reaperturaLiderCount >= 1) {
        showToast("Ya utilizó su única reapertura disponible para este registro.", "error");
        return;
      }

      const motivo = await _pedirMotivoReapertura();
      if (motivo === null) return;

      try {
        const res = await fetch(`/api/registro/${currentEditId}/reabrir`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ motivo }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.detail || "Error al reabrir el registro.", "error");
          return;
        }
        showToast("Registro reabierto exitosamente.", "success");
        // Recargar el formulario con el estado actualizado
        const metaRec = records.find(r => r.id === currentEditId);
        if (metaRec) {
          // Actualizar estado local para que _isCerrado refleje el cambio
          metaRec.estado_ac = "EN TRAMITE";
          metaRec.estado_bd = "EN TRAMITE";
          metaRec.estado_ce = "EN TRAMITE";
        }
        await openEditForm(currentEditId, metaRec || { id: currentEditId });
      } catch (e) {
        showToast("Error de red al reabrir el registro.", "error");
      }
    });
  }

  // Función de modal de reapertura (usada por el botón Reabrir)
  function _pedirMotivoReapertura() {
    return new Promise(resolve => {
      const overlay  = document.getElementById("reapertura-motivo-overlay");
      const textarea = document.getElementById("reapertura-motivo-input");
      const errMsg   = document.getElementById("reapertura-motivo-error");
      const btnOk    = document.getElementById("btn-reapertura-motivo-confirmar");
      const btnCan   = document.getElementById("btn-reapertura-motivo-cancelar");

      textarea.value = "";
      errMsg.style.display = "none";
      overlay.classList.remove("hidden");
      textarea.focus();

      function cleanup() {
        overlay.classList.add("hidden");
        btnOk.removeEventListener("click", onOk);
        btnCan.removeEventListener("click", onCancel);
      }
      function onOk() {
        const val = textarea.value.trim();
        if (!val) { errMsg.style.display = "block"; return; }
        cleanup();
        resolve(val);
      }
      function onCancel() { cleanup(); resolve(null); }

      btnOk.addEventListener("click", onOk);
      btnCan.addEventListener("click", onCancel);
    });
  }

  btnSubmit.addEventListener("click", async () => {
    // Limpiar marcas de error del intento anterior antes de revalidar.
    _clearAllFieldErrors();

    // ---- Verificar fechas con valor inválido (ej. 31/04/2026) ----
    const _badDates = Array.from(
      dynamicForm.querySelectorAll('input[type="date"]')
    ).filter(el => !el.disabled && !el.readOnly && el.validity.badInput);
    if (_badDates.length > 0) {
      _badDates.forEach(el => _setDateInvalidError(el));
      _badDates[0].focus();
      showToast("Hay campos de fecha con un valor inválido.", "error");
      return;
    }

    const campos = {};

    // Recoger todos los inputs del formulario: editables + readOnly automáticos (no disabled)
    dynamicForm.querySelectorAll("[name^='field_']:not([disabled])").forEach((el) => {
      const codigo = el.name.replace("field_", "");
      // Para campos moneda o porcentaje automático: usar el valor numérico puro
      const val = el.dataset.currency === "true"
        ? (el.dataset.rawValue || _rawCurrencyValue(el.value))
        : el.dataset.percentAuto === "true"
          ? (el.dataset.rawValue || el.value)
          : el.value;
      if (val) campos[codigo] = val;
    });

    // ---- Cuotas eliminadas: limpiar explícitamente sus valores en el servidor ----
    for (const code of _clearedCuotaCodes) {
      campos[code] = "";
    }

    // ---- Eliminar filas de cuota vacías al guardar (excepto la primera) ----
    // Una fila es vacía si monto=0/vacío Y fecha tentativa vacía.
    // Si la fila tiene datos parciales (dupla incompleta), la validación anterior ya bloqueó.
    {
      const _g2Widget = dynamicForm.querySelector('.cuotas-widget[data-cuota-type="g2"]');
      if (_g2Widget) {
        const _g2List = _g2Widget.querySelector('.cuotas-list');
        const _g2Rows = _g2List ? Array.from(_g2List.querySelectorAll('.cuota-row')) : [];
        _g2Rows.forEach((row, posIdx) => {
          if (posIdx === 0) return; // primera fila: siempre visible
          const idxAttr = row.dataset.cuotaIdx;
          if (idxAttr === undefined) return;
          const def = _CUOTA_DEF[parseInt(idxAttr)];
          if (!def) return;
          const mInp = row.querySelector(`[data-field-code="${def.monto}"]`);
          const fInp = row.querySelector(`[data-field-code="${def.fecha_tent}"]`);
          const rawM = mInp?.dataset.rawValue !== undefined ? mInp.dataset.rawValue : _rawCurrencyValue(mInp?.value || "");
          const tieneMonto = rawM !== "" && parseFloat(String(rawM).replace(/[^\d.-]/g, "")) > 0;
          const tieneFecha = !!(fInp?.value);
          if (!tieneMonto && !tieneFecha) {
            // Fila vacía: marcar sus códigos para limpiar en BD y quitar del DOM
            _clearedCuotaCodes.add(def.monto);
            _clearedCuotaCodes.add(def.fecha_tent);
            _clearedCuotaCodes.add(def.fecha_real);
            campos[def.monto] = "";
            campos[def.fecha_tent] = "";
            campos[def.fecha_real] = "";
            row.remove();
            // Sync: quitar la misma posición del widget contralor
            const _cList = dynamicForm.querySelector('.cuotas-widget[data-cuota-type="contralor"] .cuotas-list');
            if (_cList) {
              const _cRows = _cList.querySelectorAll('.cuota-row');
              if (_cRows[posIdx]) _cRows[posIdx].remove();
            }
          }
        });
      }
    }

    if (Object.keys(campos).length === 0) {
      showToast("Complete al menos un campo editable.", "error");
      return;
    }

    // Soft-warning helper: para registros existentes, si ningún campo participante cambió
    // respecto a _originalCampos → registra advertencia en lugar de bloquear.
    const _softWarnings = [];
    const _softOrBlock = (codes, msg) => {
      if (currentEditId === null) return true;
      // Un campo cuenta como "cambiado" solo si está en el payload (campos) y su valor difiere del original.
      // Si no está en campos (campo de otro rol, deshabilitado), no se considera cambio.
      const anyChanged = codes.some(c => {
        if (!(c in campos)) return false;
        const cur  = (campos[c] ?? "").toString().trim();
        const orig = (_originalCampos?.[c] ?? "").toString().trim();
        return cur !== orig;
      });
      if (anyChanged) return true;
      _softWarnings.push(msg);
      return false;
    };

    // Detectar si AC, BD o CE están en estado de cierre.
    // Cuando hay cierre, solo se validan CF y CG; el resto de validaciones se omite.
    const _esACCierreSubmit = _AC_CIERRE_VALS_LOCK.includes((campos.AC || "").toString().trim());
    const _esBDCierreSubmit = _BD_CIERRE_VALS_LOCK.includes((campos.BD || "").toString().trim());
    const _esCECierreSubmit = _CE_CIERRE_VALS_LOCK.includes((campos.CE || "").toString().trim());

    // Cuando hay cierre activo, construir lista de campos a limpiar en BD.
    // No se agregan a `campos` (el backend filtra val == ""), sino a `limpiar_campos`
    // que el backend procesa como NULL explícito, sin pasar por el filtro de vacíos.
    const _limpiarCamposPayload = [];
    if (_esACCierreSubmit || _esBDCierreSubmit || _esCECierreSubmit) {
      dynamicForm.querySelectorAll("[name^='field_'][disabled]").forEach(el => {
        if (el.dataset._acCierreLocked === "1" || el.dataset._bdCierreLocked === "1" || el.dataset._ceCierreLocked === "1") {
          const _codLocked = (el.name || "").replace(/^field_/i, "").toUpperCase();
          if (_codLocked) _limpiarCamposPayload.push(_codLocked);
        }
      });
    }

    // Declarar aquí (scope externo) para que sean accesibles fuera del bloque if,
    // especialmente en el check de motivo de devolución (BY ENVIADA → DEVUELTO).
    const _byOriginalSub  = (_originalCampos["BY"] || "").trim();
    const _byNuevoSub     = (campos["BY"] || "").trim();
    const _isContralorSub = sessionPermisos.includes("CONTRALOR") || sessionIsAdmin;

    if (!_esACCierreSubmit && !_esBDCierreSubmit && !_esCECierreSubmit) {
    // ---- Validación: campo B (Regional IPS) debe coincidir con campo C (Ciudad Responsable) ----
    if (currentEditId === null && !_mismatchConfirmed) {
      const valB = (campos.B || "").trim().toUpperCase();
      const valC = (campos.C || "").trim().toUpperCase();
      if (valB && valC && valB !== valC) {
        $("ciudad-mismatch-msg").textContent =
          `La Regional IPS seleccionada ("${campos.B}") no coincide con la Ciudad Responsable ("${campos.C}").`;
        $("ciudad-mismatch-modal-overlay").classList.remove("hidden");
        return; // pausar submit hasta que el usuario decida
      }
    }
    _mismatchConfirmed = false; // resetear tras pasar la validación

    // ---- Validación: ningún campo de fecha puede ser mayor al día actual ----
    const hoy = _todayStr();
    const nombresFecha = {
      K:  "PERIODO RECLAMADO DESDE",
      L:  "PERIODO RECLAMADO HASTA",
      N:  "FECHA SOLICITUD CONCILIACIÓN IPS",
      O:  "FECHA DE ENVÍO ANÁLISIS CARTERA A IPS",
      P:  "FECHA DEL ACTA DE CARTERA",
      Q:  "FECHA FIRMA DE ACTA DE CONCILIACIÓN DE CARTERA",
      R:  "CARTERA CONCILIADA HASTA (RADICACIÓN)",
      AH: "PERÍODO CONCILIADO DE GLOSAS DESDE",
      AI: "PERÍODO CONCILIADO DE GLOSAS HASTA",
      AL: "FECHA ACTA CONCILIACIÓN FINIQUITO",
      AM: "FECHA FIRMA DE ACTA DE CONCILIACIÓN FINIQUITO",
      CC: "FECHA DE RECIBIDO SOPORTES NIVEL CENTRAL",
      CD: "FECHA FIRMA GIRO CHEQUE / VALIDACION SOPORTES",
      CG: "MES CIERRE POR NO RESPUESTA DEL PRESTADOR",
      CK: "FECHA DE PAGO ACTA DE FINIQUITO",
      CL: "FECHA DE PAGO 2DA CUOTA",
      CM: "FECHA PAGO 3RA CUOTA",
      CN: "FECHA PAGO 4TA CUOTA",
      CO: "FECHA PAGO 5TA CUOTA",
      CP: "FECHA PAGO 6TA CUOTA",
      CQ: "FECHA PAGO 7MA CUOTA",
      CR: "FECHA PAGO 8VA CUOTA",
      DC: "FECHA DEVOLUCIÓN/RETROALIMENTACIÓN",
      DH: "FECHA DEVOLUCIÓN/RETROALIMENTACIÓN 2",
      DW: "FECHA INFORME PROYECCIÓN PAGO",
      EF: "FECHA PAGO 9NA CUOTA",
      EG: "FECHA PAGO 10MA CUOTA",
      EH: "FECHA PAGO 11VA CUOTA",
      EI: "FECHA PAGO 12VA CUOTA",
      ET: "FECHA PAGO REAL CUOTA 13",
      EU: "FECHA PAGO REAL CUOTA 14",
      EV: "FECHA PAGO REAL CUOTA 15",
      EW: "FECHA PAGO REAL CUOTA 16",
      EX: "FECHA PAGO REAL CUOTA 17",
      EY: "FECHA PAGO REAL CUOTA 18",
      EZ: "FECHA PAGO REAL CUOTA 19",
      FA: "FECHA PAGO REAL CUOTA 20",
      FB: "FECHA PAGO REAL CUOTA 21",
      FD: "FECHA PAGO REAL CUOTA 22",
      FF: "FECHA PAGO REAL CUOTA 23",
      FH: "FECHA PAGO REAL CUOTA 24",
      FJ: "FECHA DEVOLUCIÓN/RETROALIMENTACIÓN 3",
      FO: "FECHA DEVOLUCIÓN/RETROALIMENTACIÓN 4",
      FT: "FECHA DEVOLUCIÓN/RETROALIMENTACIÓN 5",
    };
    let fechaFuturaEncontrada = false;

    // Validar CC y CD (solo estas dos fechas nuevas)
    // Al editar, solo validar si el valor cambió respecto al original
    if (campos.CC && campos.CC > hoy) {
      const _ccOrig = ((_originalCampos["CC"] || "")).toString().trim();
      if (currentEditId === null || campos.CC.trim() !== _ccOrig) {
        const el = dynamicForm.querySelector("[data-field-code='CC']");
        if (el) el.classList.add("field-required-error");
        showToast("FECHA DE RECIBIDO SOPORTES NIVEL CENTRAL [CC] no puede ser mayor al día de hoy.", "error");
        return;
      }
    }
    if (campos.CD && campos.CD > hoy) {
      const _cdOrig = ((_originalCampos["CD"] || "")).toString().trim();
      if (currentEditId === null || campos.CD.trim() !== _cdOrig) {
        const el = dynamicForm.querySelector("[data-field-code='CD']");
        if (el) el.classList.add("field-required-error");
        showToast("FECHA FIRMA GIRO CHEQUE [CD] no puede ser mayor al día de hoy.", "error");
        return;
      }
    }

    // Validar todos los campos de fecha que no pueden ser futuros
    // (excepto cuotas tentativas manejadas por _validateCuotaFechas,
    //  y fechas reales de pago manejadas por _validateFechasRealesPago,
    //  y CC/CD que tienen mensajes específicos arriba)
    // Al editar, solo validar si el valor cambió respecto al original
    for (const cod of [
      "K", "L", "N", "O", "P", "Q", "R",
      "AH", "AI",
      "AL", "AM",
      "CG",
      "DW",
      "ET", "EU", "EV", "EW", "EX", "EY", "EZ", "FA", "FB", "FD", "FF",
      "FJ", "FO", "FT"
    ]) {
      if (campos[cod] && campos[cod] > hoy) {
        const _codOrig = ((_originalCampos[cod] || "")).toString().trim();
        if (currentEditId !== null && campos[cod].trim() === _codOrig) continue;
        const el = dynamicForm.querySelector(`[data-field-code="${cod}"]`);
        if (el) el.classList.add("field-required-error");
        showToast(`${nombresFecha[cod]} [${cod}]: la fecha no puede ser mayor al día de hoy.`, "error");
        fechaFuturaEncontrada = true;
      }
    }
    if (fechaFuturaEncontrada) return;

    // ---- Validación: PERIODO RECLAMADO HASTA [L] debe ser mayor a DESDE [K] ----
    if (campos.K && campos.L && campos.L <= campos.K) {
      const elL = dynamicForm.querySelector("[data-field-code='L']");
      if (elL) elL.classList.add("field-required-error");
      if (_softOrBlock(["K","L"], "PERIODO RECLAMADO HASTA [L] debe ser mayor a DESDE [K]")) {
        showToast("PERIODO RECLAMADO HASTA [L] debe ser mayor a PERIODO RECLAMADO DESDE [K].", "error");
        return;
      }
    }

    // ---- Validación: orden de fechas N < O < P < Q ----
    // Se lee del DOM directamente para capturar campos de otros roles (ej: N es GESTOR 1
    // pero debe validarse contra O aunque GESTOR 2 esté guardando y N esté deshabilitado).
    const _nopqPares = [
      { menor: "N",  mayor: "O",
        nomMenor: "FECHA SOLICITUD CONCILIACIÓN IPS [N]",
        nomMayor: "FECHA DE ENVÍO ANALISIS CARTERA A IPS [O]",
        msg: "Debe ser mayor a [N]",  estricto: true },
      { menor: "O",  mayor: "P",
        nomMenor: "FECHA DE ENVÍO ANALISIS CARTERA A IPS [O]",
        nomMayor: "FECHA DEL ACTA DE CARTERA [P]",
        msg: "Debe ser mayor a [O]",  estricto: true },
      { menor: "P",  mayor: "Q",
        nomMenor: "FECHA DEL ACTA DE CARTERA [P]",
        nomMayor: "FECHA FIRMA DE ACTA DE CONCILIACION DE CARTERA [Q]",
        msg: "Debe ser mayor a [P]",  estricto: true },
      { menor: "AM", mayor: "BJ",
        nomMenor: "FECHA FIRMA DE ACTA DE CONCILIACION FINIQUITO [AM]",
        nomMayor: "FECHA TENTATIVA 1RA CUOTA [BJ]",
        msg: "Debe ser mayor a [AM]", estricto: true },
      { menor: "N",  mayor: "CG",
        nomMenor: "FECHA SOLICITUD CONCILIACIÓN IPS [N]",
        nomMayor: "MES CIERRE [CG]",
        msg: "Debe ser mayor a [N]",
        estricto: true },
      { menor: "AL", mayor: "AM",
        nomMenor: "FECHA DE ELABORACIÓN ACTA DE FINIQUITO [AL]",
        nomMayor: "FECHA FIRMA DE ACTA DE CONCILIACION FINIQUITO [AM]",
        msg: "Debe ser mayor o igual a [AL]",
        estricto: false },
    ];
    let _hayErrorOrdenBloquea = false;
    for (const { menor, mayor, nomMenor, nomMayor, msg, estricto } of _nopqPares) {
      const elMenor = dynamicForm.querySelector(`[data-field-code="${menor}"]`);
      const elMayor = dynamicForm.querySelector(`[data-field-code="${mayor}"]`);
      const valMenor = elMenor?.value || campos[menor] || "";
      const valMayor = elMayor?.value || campos[mayor] || "";
      const hayErrorPar = estricto ? (valMayor <= valMenor) : (valMayor < valMenor);
      if (valMenor && valMayor && hayErrorPar) {
        const toastVerbo = estricto ? "debe ser mayor a" : "debe ser mayor o igual a";
        if (_softOrBlock([menor, mayor], `${nomMayor} ${toastVerbo} ${nomMenor}`)) {
          if (elMayor) { _setFieldOrderError(elMayor, msg); elMayor.focus(); }
          showToast(`${nomMayor} ${toastVerbo} ${nomMenor}.`, "error");
          _hayErrorOrdenBloquea = true;
        } else {
          if (elMayor) _setFieldOrderError(elMayor, msg);
        }
      }
    }
    if (_hayErrorOrdenBloquea) return;

    // ---- Validación: formato de campos de acta (AB y AK) ----
    const _ACTA_RE_AB = /^[AB]\d{8}-\d{4}$/;  // AB: solo A o B
    const _ACTA_RE_AK = /^[ABC]\d{8}-\d{4}$/; // AK: A, B o C

    // Validar AB
    if (campos.AB && !_ACTA_RE_AB.test(campos.AB.trim())) {
      const _elAB = dynamicForm.querySelector(`#field_AB`);
      if (_elAB) _elAB.classList.add("field-required-error");
      if (_softOrBlock(["AB"], "NÚMERO ACTA [AB]: formato inválido")) {
        showToast(`NÚMERO ACTA CONCILIACIÓN CARTERA [AB]: formato inválido. Ejemplo: A21012026-0001 o B21012026-0001`, "error");
        if (_elAB) _elAB.focus();
        return;
      }
    }

    // Validar AK
    if (campos.AK && !_ACTA_RE_AK.test(campos.AK.trim())) {
      const _elAK = dynamicForm.querySelector(`#field_AK`);
      if (_elAK) _elAK.classList.add("field-required-error");
      if (_softOrBlock(["AK"], "N° ACTA [AK]: formato inválido")) {
        showToast(`N° ACTA CONCILIACIÓN FINIQUITO [AK]: formato inválido. Ejemplo: A21012026-0001, B21012026-0001 o C21012026-0001`, "error");
        if (_elAK) _elAK.focus();
        return;
      }
    }

    // ---- Validación: duplicidad de AB y AK ----
    const _excludeParam = currentEditId !== null ? `&exclude_id=${currentEditId}` : "";
    if (campos.AB) {
      try {
        const _resAB = await fetch(`${BASE}/api/registros/verificar-acta?campo=AB&valor=${encodeURIComponent(campos.AB.trim())}${_excludeParam}`);
        if (_resAB.ok && (await _resAB.json()).duplicado) {
          showToast(`NÚMERO ACTA CONCILIACIÓN CARTERA [AB]: ya existe un registro con este valor.`, "error");
          const el = dynamicForm.querySelector(`#field_AB`);
          if (el) { el.classList.add("field-required-error"); el.focus(); }
          return;
        }
      } catch (_) { /* si falla la red, el backend lo bloqueará */ }
    }
    if (campos.AK) {
      try {
        const _resAK = await fetch(`${BASE}/api/registros/verificar-acta?campo=AK&valor=${encodeURIComponent(campos.AK.trim())}${_excludeParam}`);
        if (_resAK.ok && (await _resAK.json()).duplicado) {
          showToast(`N° ACTA CONCILIACIÓN FINIQUITO [AK]: ya existe un registro con este valor.`, "error");
          const el = dynamicForm.querySelector(`#field_AK`);
          if (el) { el.classList.add("field-required-error"); el.focus(); }
          return;
        }
      } catch (_) { /* si falla la red, el backend lo bloqueará */ }
    }

    // ---- Validación: valores negativos en columnas numéricas y de fecha ----
    const columnasNumericas = [
      "E", "M", "S", "T", "U", "V", "W", "X", "Y", "Z", "AA", "FX",
      "AD", "AJ", "AN", "AO", "AP", "AQ", "AR", "AS", "AT", "AU", "AV", "AW", "AX", "AY", "AZ", "BA", "BB", "BC",
      "BF", "BG", "BH", "BI", "BK", "BM", "BO", "BQ", "BS", "BU", "BW",
      "BZ", "CA", "CG", "CJ", "CT", "CU", "CV",
      "DN", "DX", "DY", "DZ", "E", "EA", "EB", "EC", "ED", "EE", "EF", "EG", "EH", "EI"
    ];
    const columnasConNegativo = [];
    const columnasConNegativoBloquea = [];

    for (const cod of columnasNumericas) {
      const valor = campos[cod];
      if (valor !== undefined && valor !== null && valor !== "") {
        const numVal = parseFloat(String(valor).replace(/[^\d.-]/g, ''));
        if (!isNaN(numVal) && numVal < 0) {
          columnasConNegativo.push(cod);
          const el = dynamicForm.querySelector(`[data-field-code="${cod}"]`);
          if (el) el.classList.add("field-required-error");
          if (_softOrBlock([cod], `Campo [${cod}]: valor negativo`)) columnasConNegativoBloquea.push(cod);
        }
      }
    }

    // Campos calculados automáticos numéricos (DOM-based)
    dynamicForm.querySelectorAll('[data-field-modo="AUTOMATICA"]').forEach(el => {
      const cod = el.dataset.fieldCode;
      if (!cod || !_NUMERIC_TIPOS.has(el.dataset.tipoDato || "")) return;
      if (columnasNumericas.includes(cod)) return; // ya chequeado arriba
      const raw = el.dataset.rawValue !== undefined ? el.dataset.rawValue : el.value;
      const numVal = parseFloat(String(raw).replace(/[^\d.-]/g, ''));
      if (!isNaN(numVal) && numVal < 0) {
        columnasConNegativo.push(cod);
        _applyCalcFieldStyle(cod, numVal);
        if (_softOrBlock([cod], `Campo calculado [${cod}]: valor negativo`)) columnasConNegativoBloquea.push(cod);
      }
    });

    if (columnasConNegativoBloquea.length > 0) {
      showToast(`❌ No se puede almacenar un campo negativo. Por favor revise la columna: ${columnasConNegativoBloquea.join(", ")}`, "error");
      return;
    }

    // ---- Validación: duplas de cuota (monto+fecha tentativa deben ser ambos llenos o ambos vacíos, sin huecos) ----
    if (_validateCuotaDuplas()) {
      const _cuotaAllCodes = _CUOTA_DEF.flatMap(d => [d.monto, d.fecha_tent]);
      if (_softOrBlock(_cuotaAllCodes, "Cuotas: alguna tiene monto sin fecha tentativa o viceversa, o están en orden incorrecto")) {
        showToast("❌ Cuotas incompletas: cada cuota debe tener monto y fecha tentativa, y deben llenarse en orden.", "error");
        return;
      }
    }

    // ---- Validación: orden ascendente de fechas tentativas de cuotas ----
    if (_validateCuotaFechas()) {
      const _cuotaFechaCodes = _CUOTA_DEF.map(d => d.fecha_tent);
      if (_softOrBlock(_cuotaFechaCodes, "Fechas tentativas de cuotas no están en orden ascendente")) {
        showToast("Las fechas tentativas de cuotas deben ser estrictamente ascendentes.", "error");
        return;
      }
    }

    // ---- Validación: fechas reales de pago no pueden ser futuras ----
    // Al editar, solo valida los campos que fueron modificados respecto al original
    if (_validateFechasRealesPago(currentEditId !== null)) {
      showToast("❌ Las fechas reales de pago no pueden ser fechas futuras.", "error");
      return;
    }

    // ---- Validación: si AK no está vacío, AL tampoco puede estarlo ----
    if (campos.AK && !campos.AL) {
      const alEl = dynamicForm.querySelector(`[data-field-code="AL"]`);
      if (alEl) alEl.classList.add("field-required-error");
      if (_softOrBlock(["AK","AL"], "N° ACTA [AK] tiene valor pero FECHA ACTA FINIQUITO [AL] está vacío")) {
        showToast("❌ Si N° ACTA CONCILIACIÓN FINIQUITO [AK] tiene valor, FECHA ACTA CONCILIACIÓN FINIQUITO [AL] no puede estar vacío.", "error");
        if (alEl) alEl.focus();
        return;
      }
    }

    // ---- Reglas de estado BY: ENVIADA A CONTROLAR MEDICO NACIONAL ----
    // (_byOriginalSub, _byNuevoSub, _isContralorSub declarados en scope externo)

    // Si BY ya estaba ENVIADA y no es CONTRALOR ni LIDER con acceso extendido → bloquear guardado
    if (_byOriginalSub === _BY_ENVIADA_VAL && !_isContralorSub && !_liderTieneAccesoContralor(_originalCampos)) {
      showToast("❌ El registro está en estado 'ENVIADA A CONTROLAR MEDICO NACIONAL'. Solo el Contralor puede realizar modificaciones.", "error");
      return;
    }

    // Si se intenta poner BY = ENVIADA: solo el LIDER (o admin) puede establecerlo, NO el GESTOR 2
    if (_byNuevoSub === _BY_ENVIADA_VAL && _byOriginalSub !== _BY_ENVIADA_VAL) {
      const _rolSub = (currentRole || "").toUpperCase();
      if (_rolSub !== "LIDER" && !sessionIsAdmin) {
        showToast("❌ Solo el LIDER puede marcar el estado 'ENVIADA A CONTROLAR MEDICO NACIONAL'. El GESTOR 2 no tiene esta autorización.", "error");
        const _byElSub = dynamicForm.querySelector("[data-field-code='BY']");
        if (_byElSub) _byElSub.classList.add("field-required-error");
        return;
      }
    }

    // Si BY estaba ENVIADA y CONTRALOR (o LIDER con acceso extendido) intenta cambiarlo a algo diferente de DEVUELTO
    if (_byOriginalSub === _BY_ENVIADA_VAL && (_isContralorSub || _liderTieneAccesoContralor(_originalCampos)) && _byNuevoSub && _byNuevoSub !== _BY_ENVIADA_VAL && _byNuevoSub !== _BY_DEVUELTO_VAL) {
      showToast(`❌ Cuando BY está en 'ENVIADA A CONTROLAR MEDICO NACIONAL', solo puede cambiarse a 'DEVUELTO COMO CONTRARLO PARA REVISION'.`, "error");
      const _byElSub = dynamicForm.querySelector("[data-field-code='BY']");
      if (_byElSub) _byElSub.classList.add("field-required-error");
      return;
    }

    // ---- Validación: BY solo se puede colocar si hay valores en AK y AL ----
    if (campos.BY) {
      if (!campos.AK || !campos.AL) {
        const byEl = dynamicForm.querySelector(`[data-field-code="BY"]`);
        if (byEl) byEl.classList.add("field-required-error");
        if (_softOrBlock(["BY","AK","AL"], "BY: N° ACTA [AK] y FECHA ACTA [AL] deben tener valor")) {
          showToast("❌ OBSERVACIÓN CONCILIACIÓN [BY] solo se puede colocar si hay valores en N° ACTA CONCILIACIÓN FINIQUITO [AK] y FECHA ACTA CONCILIACIÓN FINIQUITO [AL].", "error");
          if (byEl) byEl.focus();
          return;
        }
      } else {
        const byValue = (campos.BY || "").toString().toUpperCase();
        // Validación: Si AM está vacío, BY debe contener "IPS"
        if (!campos.AM) {
          if (!byValue.includes("IPS")) {
            const byEl = dynamicForm.querySelector(`[data-field-code="BY"]`);
            if (byEl) byEl.classList.add("field-required-error");
            if (_softOrBlock(["BY","AM"], "BY no contiene 'IPS' pero AM está vacío")) {
              showToast("❌ Si SALDO A REMANENTE [AM] está vacío, OBSERVACIÓN CONCILIACIÓN [BY] debe contener la palabra 'IPS'.", "error");
              if (byEl) byEl.focus();
              return;
            }
          }
        } else {
          // Validación: Si AM tiene valor, BY NO puede contener "IPS"
          if (byValue.includes("IPS")) {
            const byEl = dynamicForm.querySelector(`[data-field-code="BY"]`);
            if (byEl) byEl.classList.add("field-required-error");
            if (_softOrBlock(["BY","AM"], "BY contiene 'IPS' pero AM tiene valor")) {
              showToast("❌ Si SALDO A REMANENTE [AM] tiene valor, OBSERVACIÓN CONCILIACIÓN [BY] NO puede contener la palabra 'IPS'.", "error");
              if (byEl) byEl.focus();
              return;
            }
          }
        }
      }
    }

    // ---- Validación: BD = TRAMITADO → GESTOR/LIDER no puede modificar BD ----
    const _bdOrigTram = ((_originalCampos["BD"] || "")).toString().trim();
    if (_bdOrigTram === "TRAMITADO" && !_isContralorSub) {
      const _bdNuevoTram = (campos["BD"] || "").toString().trim();
      if (_bdNuevoTram !== _bdOrigTram) {
        showToast("❌ El campo BD se encuentra en estado TRAMITADO. Solo el Contralor o Administración pueden modificarlo.", "error");
        const _bdElTram = dynamicForm.querySelector(`[data-field-code="BD"]`);
        if (_bdElTram) _bdElTram.classList.add("field-required-error");
        return;
      }
    }

    // ---- Validación: solo CONTRALOR o Admin pueden modificar cuando CE = TRAMITADO ----
    const ceValor = (campos.CE || "").toString().trim().toUpperCase();
    const rol = (currentRole || "").trim().toUpperCase();

    if (ceValor === "TRAMITADO" && !_isContralorSub) {
      // Si CE = TRAMITADO y no es CONTRALOR, verificar que no haya cambios en campos O-CL
      const _O_CL_CODES = [
        "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "AA", "AB", "AC", "AD", "AE", "AF", "AG", "AH", "AI", "AJ", "AK", "AL", "AM", "AN", "AO", "AP", "AQ", "AR", "AS", "AT", "AU", "AV", "AW", "AX", "AY", "AZ", "BA", "BB", "BC", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BK", "BL", "BM", "BN", "BO", "BP", "BQ", "BR", "BS", "BT", "BU", "BV", "BW", "BX", "BY", "BZ", "CA", "CB", "CC", "CD"
      ];

      const camposOCLModificados = [];
      for (const cod of _O_CL_CODES) {
        const valActual = (campos[cod] || "").toString().trim();
        const valOriginal = (_originalCampos[cod] || "").toString().trim();
        if (valActual !== valOriginal) {
          camposOCLModificados.push(cod);
        }
      }

      if (camposOCLModificados.length > 0) {
        showToast(`❌ Error: El proceso se encuentra en estado TRAMITADO. En este momento, solo el rol CONTRALOR puede hacer cambios.`, "error");
        const ceEl = dynamicForm.querySelector(`[data-field-code="CE"]`);
        if (ceEl) { ceEl.classList.add("field-required-error"); }
        return;
      }
    }

    // ---- Validación: si hay datos en O-CL, CE no puede estar vacío (GESTOR 2, LIDER, CONTRALOR) ----
    // Se omite durante la validación inicial del registro (botón "Validar Registro")
    if (!_pendingValidar && (rol.includes("GESTOR 2") || rol === "LIDER" || rol === "CONTRALOR")) {
      // Solo validar O-CL → CE si estamos EDITANDO un registro existente (no en creación)
      if (currentEditId !== null) {
        const _O_CL_CODES = [
          "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "AA", "AB", "AC", "AD", "AE", "AF", "AG", "AH", "AI", "AJ", "AK", "AL", "AM", "AN", "AO", "AP", "AQ", "AR", "AS", "AT", "AU", "AV", "AW", "AX", "AY", "AZ", "BA", "BB", "BC", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BK", "BL", "BM", "BN", "BO", "BP", "BQ", "BR", "BS", "BT", "BU", "BV", "BW", "BX", "BY", "BZ", "CA", "CB", "CC", "CD", "CE", "CF", "CG", "CH", "CI", "CJ", "CK", "CL"
        ];
        // Filtrar solo O-CL (antes de CE)
        const _O_CL_FILTERED = _O_CL_CODES.filter(c => c !== "CE");
        const hayDatosEnOCL = _O_CL_FILTERED.some(c => campos[c] && String(campos[c]).trim() !== "");
        const ceVacio = !campos.CE || String(campos.CE).trim() === "";

        if (hayDatosEnOCL && ceVacio) {
          const ceEl = dynamicForm.querySelector(`[data-field-code="CE"]`);
          if (ceEl) ceEl.classList.add("field-required-error");
          if (_softOrBlock([..._O_CL_FILTERED, "CE"], "CE vacío pero hay datos en el proceso [O-CL]")) {
            showToast(`❌ Error: El campo de ESTADO PROCESO CONCILIACIÓN [CE] no puede estar vacío.`, "error");
            if (ceEl) ceEl.focus();
            return;
          }
        }
      }
    }

    // ---- Validación: si AL no está vacío, AK tampoco puede estarlo ----
    if (campos.AL && !campos.AK) {
      const akEl = dynamicForm.querySelector(`[data-field-code="AK"]`);
      if (akEl) akEl.classList.add("field-required-error");
      if (_softOrBlock(["AL","AK"], "FECHA ACTA [AL] tiene valor pero N° ACTA [AK] está vacío")) {
        showToast("❌ Si FECHA ACTA CONCILIACIÓN FINIQUITO [AL] tiene valor, N° ACTA CONCILIACIÓN FINIQUITO [AK] no puede estar vacío.", "error");
        if (akEl) akEl.focus();
        return;
      }
    }

    // ---- Validación: fechas tentativas de cuotas (BJ, BL, BN...) deben ser futuras y días laborales ----
    // Al editar un registro existente: si la fecha ya estaba guardada y no cambió, no se rechaza.
    const _festivos = await _loadFestivosSet();
    const _hoy = new Date(); _hoy.setHours(0, 0, 0, 0);
    const _isEditando = currentEditId !== null;
    const _errFechasCuota = [];
    for (const def of _CUOTA_DEF) {
      const fechaVal = (campos[def.fecha_tent] || "").toString().trim();
      if (!fechaVal) continue;
      // Si estamos editando y el valor no cambió respecto al original, saltar validación de futuro
      if (_isEditando) {
        const _valOrig = ((_originalCampos[def.fecha_tent] || "")).toString().trim();
        if (fechaVal === _valOrig) continue;
      }
      const fechaDate = new Date(fechaVal + "T00:00:00");
      if (isNaN(fechaDate)) continue;
      if (fechaDate <= _hoy) {
        _errFechasCuota.push(`${def.fecha_tent} (cuota ${def.n}): debe ser una fecha futura`);
        continue;
      }
      const dow = fechaDate.getDay(); // 0=dom, 6=sab
      const iso = fechaVal.split("T")[0];
      if (dow === 0 || dow === 6 || _festivos.has(iso)) {
        const _laboMsg = `${def.fecha_tent} (cuota ${def.n}): no es día laboral`;
        if (_softOrBlock([def.fecha_tent], _laboMsg)) _errFechasCuota.push(_laboMsg);
      }
    }
    if (_errFechasCuota.length > 0) {
      showToast(`❌ Fechas tentativas de cuotas inválidas: ${_errFechasCuota.join(" | ")}`, "error", 7000);
      return;
    }

    // ---- Validación: cuotas no permitidas si BF está vacío o es cero ----
    const _bfVal = parseFloat((campos.BF || "0").toString().replace(/[^\d.-]/g, "")) || 0;
    if (_bfVal === 0) {
      const _cuotasConValor = _CUOTA_DEF.filter(def => {
        const n = parseFloat((campos[def.monto] || "0").toString().replace(/[^\d.-]/g, "")) || 0;
        return n > 0;
      });
      if (_cuotasConValor.length > 0) {
        _cuotasConValor.forEach(def => {
          const el = dynamicForm.querySelector(`[data-field-code="${def.monto}"]`);
          if (el) el.classList.add("field-required-error");
        });
        if (_softOrBlock(["BF", ..._cuotasConValor.map(d => d.monto)], "VALOR ASUMIDO EPS [BF] está vacío/cero pero hay cuotas con valor")) {
          const _primerEl = dynamicForm.querySelector(`[data-field-code="${_cuotasConValor[0].monto}"]`);
          if (_primerEl) _primerEl.focus();
          showToast("No se pueden ingresar cuotas si VALOR ASUMIDO EPS [BF] está vacío o es cero.", "error");
          return;
        }
      }
    }

    // ---- Validación: suma de cuotas debe ser igual a BF (VALOR ASUMIDO EPS) ----
    if (_bfVal > 0) {
      // En edición: saltar si ni BF ni ningún monto de cuota cambió respecto al guardado
      const _skipSumaBF = _isEditando && (() => {
        const _bfOrig = parseFloat(((_originalCampos.BF || "0")).toString().replace(/[^\d.-]/g, "")) || 0;
        if (Math.abs(_bfVal - _bfOrig) >= 1) return false; // BF cambió → validar
        return !_CUOTA_DEF.some(def => {
          const curr = (campos[def.monto] || "").toString().trim();
          const orig = ((_originalCampos[def.monto] || "")).toString().trim();
          return curr !== orig;
        });
      })();
      if (!_skipSumaBF) {
        let _sumaCuotas = 0;
        for (const def of _CUOTA_DEF) {
          const n = parseFloat((campos[def.monto] || "0").toString().replace(/[^\d.-]/g, ""));
          if (!isNaN(n)) _sumaCuotas += n;
        }
        if (_sumaCuotas > 0 && Math.abs(_sumaCuotas - _bfVal) > 1) {
          showToast(`❌ La suma de las cuotas ($${_sumaCuotas.toLocaleString("es-CO")}) no es igual a VALOR ASUMIDO EPS [BF] ($${_bfVal.toLocaleString("es-CO")}). No se puede Actualizar Registro.`, "error");
          return;
        }
      }
    }

    // ---- Validación de campos obligatorios ----
    let seccionValidar = null;
    if (currentEditId === null) {
      seccionValidar = "crear";
    } else {
      const r = (currentRole || "").toUpperCase();
      if (r === "GESTOR 2" || r === "LIDER") seccionValidar = "g2_lider";
      else if (r === "CONTRALOR") seccionValidar = "contralor";
    }
    if (seccionValidar) {
      const errores = validateRequiredFields(seccionValidar);
      if (errores.length) {
        showToast(`Campos obligatorios faltantes: ${errores.length}. Revise los campos marcados en rojo.`, "error");
        return;
      }
    }
    // LIDER con acceso extendido: también validar campos requeridos de CONTRALOR
    if (currentEditId !== null && currentRole === "LIDER" && _liderTieneAccesoContralor(_originalCampos)) {
      const erroresCtrl = validateRequiredFields("contralor");
      if (erroresCtrl.length) {
        showToast(`Campos obligatorios de Contralor faltantes: ${erroresCtrl.length}. Revise los campos marcados en rojo.`, "error");
        return;
      }
    }

    } // fin if (!_esACCierreSubmit)

    // ---- Validación especial para AC cierre (CF, CG, AH..CE) ----
    const acValor = (campos.AC || "").toString().trim();
    const _AC_CIERRE = [
      "CERRADO POR CANCELACION DE MESA",
      "CERRADO POR CANCELACION DE MESAS",
      "CERRADO SIN FINALIZACIÓN",
      "IPS NO ASISTE A MESAS"
    ];
    const _esACCierre = _AC_CIERRE.includes(acValor);
    if (_esACCierre && _cfcgRevealed) {
      // Verificar CF y CG llenos
      const cfLleno = campos.CF && String(campos.CF).trim() !== "";
      const cgLleno = campos.CG && String(campos.CG).trim() !== "";
      if (!cfLleno || !cgLleno) {
        showToast("No se puede guardar. CAUSA CIERRE PROCESO CONCILIACIÓN POR NO RESPUESTA [CF] y MES CIERRE POR NO RTA DEL PRESTADOR/CANCELACIÓN MESAS [CG] deben estar llenos para cambiar el estado de ESTADO CONCILIACION CARTERA [AC].", "error");
        return;
      }
      // Verificar CG = fecha de hoy
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const cgFecha = String(campos.CG).trim().split('T')[0];
      if (cgFecha !== today) {
        showToast(`No se puede guardar. El campo MES CIERRE POR NO RTA DEL PRESTADOR/CANCELACIÓN MESAS [CG] debe contener la fecha de hoy (${today}).`, "error");
        return;
      }
      // Verificar AH..CE vacíos
      const _FIN_CODES = [
        "AH","AI","AJ","AK","AL","AM","AN","AO","AP","AQ","AR","AS","AT","AU","AV","AW","AX","AY","AZ",
        "BA","BB","BC","BD","BE","BF","BG","BH","BI","BJ","BK","BL","BM","BN","BO","BP","BQ","BR","BS","BT","BU","BV","BW","BX","BY","BZ",
        "CA","CB","CC","CD","CE"
      ];
      // BD y CE son campos de estado: no se requiere que estén vacíos al cerrar AC
      const _FIN_CODES_SKIP_AC = new Set(["BD", "CE"]);
      const camposConDatos = _FIN_CODES.filter(c => {
        if (_FIN_CODES_SKIP_AC.has(c)) return false;
        if (!campos[c] || String(campos[c]).trim() === "") return false;
        // Ignorar campos automáticos: el usuario no los controla
        const _elFin = dynamicForm.querySelector(`[data-field-code="${c}"]`);
        if (_elFin && _elFin.dataset.fieldModo === "AUTOMATICA") return false;
        return true;
      });
      if (camposConDatos.length > 0) {
        showToast(`No se puede guardar. Los siguientes campos de FINIQUITO [AH..CE] deben estar vacíos para cambiar el estado de ESTADO CONCILIACION CARTERA [AC]: ${camposConDatos.join(', ')}`, "error");
        return;
      }
    }

    // ---- Validación especial para BD cierre (CF, CG) ----
    if (_esBDCierreSubmit && _cfcgRevealed) {
      const _cfLlenoBD = campos.CF && String(campos.CF).trim() !== "";
      const _cgLlenoBD = campos.CG && String(campos.CG).trim() !== "";
      if (!_cfLlenoBD || !_cgLlenoBD) {
        showToast("No se puede guardar. CAUSA CIERRE PROCESO CONCILIACIÓN POR NO RESPUESTA [CF] y MES CIERRE POR NO RTA DEL PRESTADOR/CANCELACIÓN MESAS [CG] deben estar llenos para cambiar el estado de ESTADO FINIQUITO [BD].", "error");
        return;
      }
      const _dBD = new Date();
      const _todayBD = `${_dBD.getFullYear()}-${String(_dBD.getMonth() + 1).padStart(2, '0')}-${String(_dBD.getDate()).padStart(2, '0')}`;
      const _cgFechaBD = String(campos.CG).trim().split('T')[0];
      if (_cgFechaBD !== _todayBD) {
        showToast(`No se puede guardar. El campo MES CIERRE POR NO RTA DEL PRESTADOR/CANCELACIÓN MESAS [CG] debe contener la fecha de hoy (${_todayBD}).`, "error");
        return;
      }
    }

    // ---- Validación especial para CE cierre (CF, CG) ----
    if (_esCECierreSubmit && _cfcgRevealed) {
      const _cfLlenoCE = campos.CF && String(campos.CF).trim() !== "";
      const _cgLlenoCE = campos.CG && String(campos.CG).trim() !== "";
      if (!_cfLlenoCE || !_cgLlenoCE) {
        showToast("No se puede guardar. CAUSA CIERRE [CF] y MES CIERRE [CG] deben estar llenos para cambiar el estado de ESTADO PROCESO CONCILIACIÓN [CE].", "error");
        return;
      }
      const _dCE = new Date();
      const _todayCE = `${_dCE.getFullYear()}-${String(_dCE.getMonth() + 1).padStart(2, '0')}-${String(_dCE.getDate()).padStart(2, '0')}`;
      const _cgFechaCE = String(campos.CG).trim().split('T')[0];
      if (_cgFechaCE !== _todayCE) {
        showToast(`No se puede guardar. El campo MES CIERRE [CG] debe contener la fecha de hoy (${_todayCE}).`, "error");
        return;
      }
    }

    // ---- Validación especial para BH (no puede superar 100%) ----
    const bhValor = (campos.BH || "").toString().trim();
    if (bhValor) {
      const bhNumerico = parseFloat(bhValor.toString().replace(/[^\d.,-]/g, ''));
      if (!isNaN(bhNumerico) && bhNumerico > 100) {
        const bhEl = dynamicForm.querySelector(`[data-field-code="BH"]`);
        if (bhEl) bhEl.classList.add("field-required-error");
        if (_softOrBlock(["BH"], `BH: porcentaje supera el 100% (${bhValor})`)) {
          showToast(`❌ Error: El campo BH no puede superar el 100%. Actualmente tiene ${bhValor}`, "error");
          return;
        }
      }
    }

    // ---- Validación especial para AK y BE (TIPO CONCILIACIÓN GLOSA) ----
    const akValor = (campos.AK || "").toString().trim();
    const beValor = (campos.BE || "").toString().trim();

    if (akValor && beValor) {
      const akInicia = akValor.substring(0, 1).toUpperCase();
      let _akBeBloquea = false;

      // Si AK inicia con B o C, BE DEBE ser "NO QUEDARON SALDOS DE GLOSA POR CONCILIAR"
      if ((akInicia === "B" || akInicia === "C") && beValor !== "NO QUEDARON SALDOS DE GLOSA POR CONCILIAR") {
        const beEl = dynamicForm.querySelector(`[data-field-code="BE"]`);
        if (beEl) beEl.classList.add("field-required-error");
        if (_softOrBlock(["AK","BE"], `AK inicia con "${akInicia}": BE debe ser "NO QUEDARON SALDOS DE GLOSA POR CONCILIAR"`)) {
          showToast(`❌ Error: Si AK inicia con "${akInicia}", BE debe ser "NO QUEDARON SALDOS DE GLOSA POR CONCILIAR". Actualmente tiene "${beValor}"`, "error");
          _akBeBloquea = true;
        }
      }

      // Si AK inicia con A, BE puede ser "ADTIVA/PARETO" o "UNO A UNO"
      if (akInicia === "A" && !["ADTIVA/PARETO", "UNO A UNO"].includes(beValor)) {
        const beEl = dynamicForm.querySelector(`[data-field-code="BE"]`);
        if (beEl) beEl.classList.add("field-required-error");
        if (_softOrBlock(["AK","BE"], `AK inicia con "A": BE debe ser "ADTIVA/PARETO" o "UNO A UNO"`)) {
          showToast(`❌ Error: Si AK inicia con "A", BE debe ser "ADTIVA/PARETO" o "UNO A UNO". Actualmente tiene "${beValor}"`, "error");
          _akBeBloquea = true;
        }
      }

      if (_akBeBloquea) return;
    }

    // ---- Validación especial para BD (estado cierre finiquito) ----
    const bdValor = (campos.BD || "").toString().trim();
    const _BD_CERRADO_SIN_FIN = "CERRADO SIN FINALIZACIÓN";
    const _BD_EN_TRAMITE = "EN TRAMITE";
    const _BD_TRAMITADO = "TRAMITADO";

    // Normalizar valores para comparación
    const bdNorm = bdValor.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const _esBDCerradoSinFin = bdNorm === _BD_CERRADO_SIN_FIN.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const _esBDEnTramite = bdNorm === _BD_EN_TRAMITE.toUpperCase();
    const _esBDTramitado = bdNorm === _BD_TRAMITADO.toUpperCase();

    // Validar permisos por rol en BD
    if (bdValor) {
      const rol = (currentRole || "").trim().toUpperCase();

      // GESTOR 2 y LIDER solo pueden usar EN TRAMITE o CERRADO SIN FINALIZACIÓN
      if ((rol.includes("GESTOR 2") || rol === "LIDER") && !(_esBDEnTramite || _esBDCerradoSinFin)) {
        showToast(`❌ Error: El rol ${currentRole} solo puede usar "EN TRAMITE" o "CERRADO SIN FINALIZACIÓN" en BD. Actualmente tiene "${bdValor}"`, "error");
        const bdEl = dynamicForm.querySelector(`[data-field-code="BD"]`);
        if (bdEl) bdEl.classList.add("field-required-error");
        return;
      }
      // CONTRALOR no puede usar "CERRADO SIN FINALIZACIÓN"
      if (rol.includes("CONTRALOR") && !sessionIsAdmin && _esBDCerradoSinFin) {
        showToast(`❌ Error: El rol CONTRALOR no puede establecer "CERRADO SIN FINALIZACIÓN" en BD.`, "error");
        const bdEl = dynamicForm.querySelector(`[data-field-code="BD"]`);
        if (bdEl) bdEl.classList.add("field-required-error");
        return;
      }
    }

    if (_esBDCerradoSinFin) {
      // Verificar que AH hasta BC estén vacíos (sin incluir BD)
      const _BD_CODES = [
        "AH", "AI", "AJ", "AK", "AL", "AM", "AN", "AO", "AP", "AQ", "AR", "AS", "AT", "AU", "AV", "AW", "AX", "AY", "AZ",
        "BA", "BB", "BC"
      ];
      const camposConDatos = _BD_CODES.filter(c => campos[c] && String(campos[c]).trim() !== "");
      if (camposConDatos.length > 0) {
        if (_softOrBlock(["BD", ...camposConDatos], `BD está en "CERRADO SIN FINALIZACIÓN" pero hay datos en: ${camposConDatos.join(', ')}`)) {
          showToast(`❌ No se puede actualizar. BD está en "${_BD_CERRADO_SIN_FIN}" pero los siguientes campos de finiquito [AH..BC] tienen datos: ${camposConDatos.join(', ')}. Estos deben estar vacíos.`, "error");
          return;
        }
      }
    }

    // ---- Validación especial para AH y AI (fechas de período) ----
    // AH = PERIODO DESDE = primer día del mes
    // AI = PERIODO HASTA = último día del mes
    const _AH = campos.AH;
    const _AI = campos.AI;
    if (_AH || _AI) {
      const today = new Date();
      // Calcular: hoy - 3 meses, luego tomar el último día de ese mes
      const tresMesesAtras = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
      const maxAnio = tresMesesAtras.getFullYear();
      const maxMes = tresMesesAtras.getMonth();
      const ultimoDiaMaxMes = new Date(maxAnio, maxMes + 1, 0).getDate();
      const maxDate = new Date(maxAnio, maxMes, ultimoDiaMaxMes);
      const maxDateStr = maxDate.toISOString().split('T')[0];
      
      // Función para normalizar fecha (soporta YYYY-MM-DD o DD/MM/YYYY)
      function normalizarFecha(fecha) {
        if (!fecha) return null;
        let fechaStr = String(fecha).trim();
        if (fechaStr.includes('/')) {
          const partes = fechaStr.split('/');
          if (partes.length === 3) {
            const dia = partes[0].padStart(2, '0');
            const mes = partes[1].padStart(2, '0');
            const anio = partes[2];
            fechaStr = `${anio}-${mes}-${dia}`;
          }
        }
        return fechaStr.split('T')[0];
      }
      
      let _ahAiBloquea = false;

      // Validar AH (PERIODO DESDE): primer día del mes y <= maxDate
      if (_AH) {
        const ahDateStr = normalizarFecha(_AH);
        if (ahDateStr > maxDateStr) {
          if (_softOrBlock(["AH"], `PERIODO DESDE [AH] (${ahDateStr}) supera el máximo permitido (${maxDateStr})`)) {
            showToast(`La fecha de PERIODO CONCILIADO DE GLOSAS DESDE [AH] no debe ser mayor a ${maxDateStr}.`, "error");
            _ahAiBloquea = true;
          }
        }
        const ahDia = ahDateStr.split('-')[2];
        if (ahDia !== '01') {
          if (_softOrBlock(["AH"], "PERIODO DESDE [AH] debe ser el primer día del mes")) {
            showToast("La fecha PERIODO CONCILIADO DE GLOSAS DESDE [AH] debe ser igual al primer día del mes.", "error");
            _ahAiBloquea = true;
          }
        }
      }

      // Validar AI (PERIODO HASTA): último día del mes y <= maxDate
      if (_AI) {
        const aiDateStr = normalizarFecha(_AI);
        if (aiDateStr > maxDateStr) {
          if (_softOrBlock(["AI"], `PERIODO HASTA [AI] (${aiDateStr}) supera el máximo permitido (${maxDateStr})`)) {
            showToast(`La fecha de PERIODO CONCILIADO DE GLOSAS HASTA [AI] no debe ser mayor a ${maxDateStr}.`, "error");
            _ahAiBloquea = true;
          }
        }
        const aiPartes = aiDateStr.split('-');
        const aiAnio = parseInt(aiPartes[0]);
        const aiMes = parseInt(aiPartes[1]) - 1;
        const aiLastDay = new Date(aiAnio, aiMes + 1, 0).getDate();
        const aiDia = parseInt(aiPartes[2]);
        if (aiDia !== aiLastDay) {
          if (_softOrBlock(["AI"], "PERIODO HASTA [AI] debe ser el último día del mes")) {
            showToast(`La fecha PERIODO CONCILIADO DE GLOSAS HASTA [AI] debe ser igual al último día del mes.`, "error");
            _ahAiBloquea = true;
          }
        }
      }

      // Validar que AI >= AH
      if (_AH && _AI) {
        const ahDateStr = normalizarFecha(_AH);
        const aiDateStr = normalizarFecha(_AI);
        if (aiDateStr < ahDateStr) {
          if (_softOrBlock(["AH","AI"], "PERIODO HASTA [AI] no puede ser menor a PERIODO DESDE [AH]")) {
            showToast("La fecha de PERIODO CONCILIADO DE GLOSAS HASTA [AI] no puede ser menor a PERIODO CONCILIADO DE GLOSAS DESDE [AH].", "error");
            _ahAiBloquea = true;
          }
        }
      }

      if (_ahAiBloquea) return;
    }

    // ---- Validación widget de devoluciones ----
    if (!_validateDevolucionesWidget()) return;

    // ---- Advertencia soft: campos sin cambios con errores históricos ----
    if (_softWarnings.length > 0 && currentEditId !== null) {
      const _proceed = await _showSoftWarningsModal(_softWarnings);
      if (!_proceed) return;
    }

    // ---- Motivo de devolución: CONTRALOR (o LIDER con acceso extendido) cambiando BY de ENVIADA → DEVUELTO ----
    let _motivoDevolucion = "";
    if (_byOriginalSub === _BY_ENVIADA_VAL && _byNuevoSub === _BY_DEVUELTO_VAL &&
        (_isContralorSub || _liderTieneAccesoContralor(_originalCampos))) {
      _motivoDevolucion = await _pedirMotivoDevolucion();
      if (_motivoDevolucion === null) return; // usuario canceló
    }

    // ---- Motivo de cierre: cuando AC, BD o CE están en estado de cierre ----
    let _motivoCierre = "";
    if (currentEditId !== null && (_esACCierreSubmit || _esBDCierreSubmit || _esCECierreSubmit)) {
      _motivoCierre = await _pedirMotivoCierre();
      if (_motivoCierre === null) return; // usuario canceló
    }

    // ---- Política de aprobación: N antigua requiere comentario ----
    let _comentarioSolicitudN = "";
    const _nVal = (campos.N || "").trim();
    if (_nVal && _nEsAntigua(_nVal)) {
      // En UPDATE: solo si N cambió respecto al valor cargado
      const _nOriginal = ((_originalCampos && _originalCampos.N) || "").trim();
      const _nCambio = currentEditId === null || _nVal !== _nOriginal;
      if (_nCambio) {
        _comentarioSolicitudN = await _pedirComentarioSolicitudN();
        if (_comentarioSolicitudN === null) return; // usuario canceló
      }
    }

    // ---- Registro Finalizado: verificar CE=TRAMITADO + AC=CERRADO CON ACTA + BD=TRAMITADO ----
    // Nota: se lee directo del DOM (incluyendo campos disabled) porque los locks de cierre
    // deshabilitan CE/AC/BD y no quedan en el objeto `campos`.
    let _decisionFinalizar = null;
    {
      const _isCtrlSub = sessionPermisos.includes("CONTRALOR") || sessionIsAdmin
                         || _liderTieneAccesoContralor(_originalCampos);
      if (currentEditId !== null && _isCtrlSub) {
        const _domVal = (code) => {
          const el = dynamicForm.querySelector(`[name="field_${code}"]`);
          return el ? (el.value || "").trim().toUpperCase() : (campos[code] || "").trim().toUpperCase();
        };
        const _ceVal = _domVal("CE");
        const _acVal = _domVal("AC");
        const _bdVal = _domVal("BD");
        if (_ceVal === "TRAMITADO" && _acVal === "CERRADO CON ACTA" && _bdVal === "TRAMITADO") {
          _decisionFinalizar = await _pedirDecisionFinalizar();
          if (_decisionFinalizar === null) return; // usuario canceló
        }
      }
    }

    try {
      let res;
      if (currentEditId !== null) {
        // Actualizar registro existente (GESTOR 2, LIDER, CONTRALOR)
        res = await fetch(`/api/registro/${currentEditId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rol: currentRole, campos, motivo_devolucion: _motivoDevolucion, motivo_cierre: _motivoCierre, limpiar_campos: _limpiarCamposPayload, comentario_solicitud_n: _comentarioSolicitudN }),
        });
      } else {
        // Crear nuevo registro con campos de GESTOR 1
        res = await fetch("/api/registros", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rol: "GESTOR 1", campos, comentario_solicitud_n: _comentarioSolicitudN }),
        });
      }
      const data = await res.json();
      if (res.ok) {
        if (currentEditId !== null) {
          const _esContralorOLiderExt = currentRole === "CONTRALOR" || _liderTieneAccesoContralor(_originalCampos);
          if (_esContralorOLiderExt) {
            // ---- Finalizar proceso si el usuario aceptó ----
            if (_decisionFinalizar === "finalizar") {
              const _savedFinalId = currentEditId;
              const fRes  = await fetch(`${BASE}/api/registro/${_savedFinalId}/finalizar`, { method: "POST" });
              const fData = await fRes.json();
              if (fRes.ok) {
                showToast("✅ Registro guardado y finalizado correctamente.", "success");
                await loadMainRecords();
                showSection(finalizadosSection);
                renderFinalizadosSection();
              } else {
                showToast(`Guardado. Error al finalizar: ${fData.detail || "Error desconocido"}`, "warning");
              }
            } else {
              // Modal de confirmación para CONTRALOR / LIDER con acceso extendido (actualización normal)
              const nitEl = dynamicForm.querySelector('[data-field-code="E"]');
              const nomEl = dynamicForm.querySelector('[data-field-code="I"]');
              $("cu-nit").textContent    = nitEl?.value || campos.E || "—";
              $("cu-nombre").textContent = nomEl?.value || campos.I || "—";
              $("contralor-update-overlay").classList.remove("hidden");
              $("btn-contralor-update-ok").onclick = () => {
                $("contralor-update-overlay").classList.add("hidden");
              };
            }
          } else if (_pendingValidar) {
            // Modo "Validar Registro": guardar + marcar como validado en un solo paso
            _pendingValidar = false;
            const vRes  = await fetch(`${BASE}/api/registro/${currentEditId}/validar`, { method: "POST" });
            const vData = await vRes.json();
            if (vRes.ok) {
              showToast("✅ Registro guardado y validado correctamente.", "success");
              await loadMainRecords();
              const _metaRec = allMainRecords.find(r => r.id === currentEditId) || { id: currentEditId };
              await openEditForm(currentEditId, _metaRec);
            } else {
              showToast(`Guardado. Error al validar: ${vData.detail || "Error desconocido"}`, "warning");
            }
          } else {
            showToast("Registro actualizado exitosamente.");
          }
        } else {
          // Mostrar modal de confirmación con datos del registro creado
          $("rc-consecutivo").textContent  = data.consecutivo || campos.A || "—";
          $("rc-nit").textContent          = campos.E  || "—";
          $("rc-nombre").textContent       = campos.I  || "—";
          $("rc-responsable").textContent  = campos.AG || "—";
          $("rc-ciudad").textContent       = campos.C  || "—";
          $("registro-creado-overlay").classList.remove("hidden");
          // Al pulsar Continuar: cerrar modal y abrir formulario de edición
          const _savedId     = data.id;
          const _savedCampos = campos;
          const _savedConsec = data.consecutivo || campos.A || "";
          $("btn-registro-creado-ok").onclick = async () => {
            $("registro-creado-overlay").classList.add("hidden");
            await openEditForm(_savedId, { consecutivo: _savedConsec, nombre: _savedCampos.I || "" });
            await loadMainRecords();
          };
        }
      } else {
        showToast(data.error || "Error al guardar.", "error");
      }
    } catch {
      showToast("Error de conexion.", "error");
    }
  });

  // ---- Botones modal mismatch Regional IPS (B) vs Ciudad Responsable (C) ----
  $("btn-mismatch-proseguir").addEventListener("click", () => {
    $("ciudad-mismatch-modal-overlay").classList.add("hidden");
    _mismatchConfirmed = true;  // permitir que el siguiente click pase la validación
    btnSubmit.click();          // re-disparar el submit
  });

  $("btn-mismatch-cambiar").addEventListener("click", () => {
    $("ciudad-mismatch-modal-overlay").classList.add("hidden");
    const fieldB = dynamicForm.querySelector("#field_B");
    const fieldC = dynamicForm.querySelector("#field_C");
    if (fieldB && fieldC && fieldC.value) {
      // Sincroniza B con C (AG y A ya siguen a fieldC — no hace falta disparar change en B)
      fieldB.value = fieldC.value;
    }
    // No re-enviar: el usuario ve los cambios y decide cuándo guardar
  });

  $("btn-mismatch-cancelar").addEventListener("click", () => {
    $("ciudad-mismatch-modal-overlay").classList.add("hidden");
  });

  // ---------------------------------------------------------------
  // FORM: Clear
  // ---------------------------------------------------------------
  btnClear.addEventListener("click", clearForm);

  function clearForm() {
    dynamicForm.querySelectorAll("input:not([disabled]), select:not([disabled])").forEach((el) => {
      el.value = "";
    });
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("es-CO", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  }

  // ---------------------------------------------------------------
  // SIDEBAR — Navegación y toggle
  // ---------------------------------------------------------------
  // Mapa sección → clave sidebar (se inicializa aquí, las secciones ya están en scope)
  SECTION_VIEW.set(mainSection,    "main");
  SECTION_VIEW.set(creadosSection,     "creados");
  SECTION_VIEW.set(cerradosSection,    "cerrados");
  SECTION_VIEW.set(pendientesNSection, "pendientes-n");
  SECTION_VIEW.set(rechazadosNSection, "rechazados-n");
  SECTION_VIEW.set(pendientesOtraSection,    "pendientes-otra-regional");
  SECTION_VIEW.set(pendientesValidarSection, "pendientes-validar");
  SECTION_VIEW.set(misAuditoriasSection,     "mis-auditorias");
  SECTION_VIEW.set(formSection,    "main");
  SECTION_VIEW.set(adminSection, "admin");
  SECTION_VIEW.set(usersSection, "users");
  SECTION_VIEW.set(prestadoresSection, "prestadores");
  SECTION_VIEW.set(historialSection,   "historial");
  SECTION_VIEW.set(solicitudesSection, "solicitudes");
  SECTION_VIEW.set(festivosSection,    "festivos");
  SECTION_VIEW.set(camposSection,          "campos");
  SECTION_VIEW.set(ciudadCodigosSection,   "ciudad-codigos");
  SECTION_VIEW.set(auditSection,                "audit");
  SECTION_VIEW.set(auditoriasActivasSection,    "auditorias-activas");
  SECTION_VIEW.set(ssoAccessRequestsSection,   "sso-access-requests");
  SECTION_VIEW.set(finalizadosSection,             "finalizados");
  SECTION_VIEW.set(enRevisionContralorSection,     "en-revision-contralor");
  SECTION_VIEW.set(enCursoContralorSection,        "en-curso-contralor");
  SECTION_VIEW.set(umbralLiderSection,             "umbral-lider");

  document.querySelectorAll(".sidebar-item[data-view]").forEach(item => {
    item.addEventListener("click", () => {
      const view = item.dataset.view;
      // Persistir la vista activa para restaurar tras recarga
      sessionStorage.setItem("rur_last_view", view);
      if (view !== "main") sessionStorage.removeItem("rur_last_edit_id");
      if (view === "main") {
        showSection(mainSection);
        currentEditId = null;
        sessionStorage.removeItem("rur_last_edit_id");
        loadMainRecords();
      } else if (view === "creados") {
        showSection(creadosSection);
        renderCreadosSection();
      } else if (view === "cerrados") {
        showSection(cerradosSection);
        renderCerradosSection();
      } else if (view === "pendientes-n") {
        showSection(pendientesNSection);
        renderPendientesNSection();
      } else if (view === "rechazados-n") {
        showSection(rechazadosNSection);
        renderRechazadosNSection();
      } else if (view === "pendientes-otra-regional") {
        showSection(pendientesOtraSection);
        renderOtraRegionalSection();
      } else if (view === "pendientes-validar") {
        showSection(pendientesValidarSection);
        renderPendientesValidarSection();
      } else if (view === "mis-auditorias") {
        showSection(misAuditoriasSection);
        renderMisAuditoriasSection();
      } else if (view === "admin") {
        showSection(adminSection);
        loadAdminLists();
      } else if (view === "users") {
        showSection(usersSection);
        loadUsers();
      } else if (view === "prestadores") {
        showSection(prestadoresSection);
        loadPrestadores();
      } else if (view === "historial") {
        showSection(historialSection);
        loadHistorial("todas");
      } else if (view === "solicitudes") {
        showSection(solicitudesSection);
        _setSolicitudesTipo(solicitudesTipoActivo || "prestadores");
      } else if (view === "festivos") {
        showSection(festivosSection);
        loadFestivos();
      } else if (view === "campos") {
        showSection(camposSection);
        loadCampos();
      } else if (view === "ciudad-codigos") {
        showSection(ciudadCodigosSection);
        loadCiudadCodigos();
      } else if (view === "audit") {
        showSection(auditSection);
        loadAudit();
      } else if (view === "umbral-lider") {
        showSection(umbralLiderSection);
        loadUmbralLiderConfig();
      } else if (view === "auditorias-activas") {
        showSection(auditoriasActivasSection);
        loadAuditoriasActivas();
      } else if (view === "sso-access-requests") {
        showSection(ssoAccessRequestsSection);
        loadSsoAccessRequests();
      } else if (view === "finalizados") {
        showSection(finalizadosSection);
        renderFinalizadosSection();
      } else if (view === "en-revision-contralor") {
        showSection(enRevisionContralorSection);
        renderEnRevisionContralorSection();
      } else if (view === "en-curso-contralor") {
        showSection(enCursoContralorSection);
        renderEnCursoContralorSection();
      }
    });
  });

  $("sidebar-toggle").addEventListener("click", () => {
    $("sidebar").classList.toggle("collapsed");
  });

  // ---------------------------------------------------------------
  // ADMIN: List Management
  // ---------------------------------------------------------------
  const btnAdminBack = $("btn-admin-back");
  const adminListsGrid = $("admin-lists-grid");
  const adminDetail = $("admin-detail");
  const adminDetailTitle = $("admin-detail-title");
  const adminDetailCode = $("admin-detail-code");
  const adminNewOption = $("admin-new-option");
  const btnAddOption = $("btn-add-option");
  const adminSearchOptions = $("admin-search-options");
  const adminOptionsList = $("admin-options-list");
  const adminOptionsCount = $("admin-options-count");

  let currentAdminCodigo = null;
  let currentAdminOptions = [];

  btnAdminBack.addEventListener("click", () => {
    if (adminDetail.classList.contains("hidden")) {
      showSection(mainSection);
    } else {
      adminDetail.classList.add("hidden");
      adminListsGrid.classList.remove("hidden");
    }
  });

  // ── Umbral Lider → Contralor (admin) ──────────────────────────────────────

  async function loadUmbralLiderConfig() {
    const statusEl    = $("umbral-lider-status");
    const campoSelect = $("umbral-campo-select");
    const valorInput  = $("umbral-valor-input");
    const btnSave     = $("btn-umbral-lider-save");
    const btnDisable  = $("btn-umbral-lider-desactivar");
    const btnBack     = $("btn-umbral-lider-back");

    // Botón volver
    if (btnBack) btnBack.onclick = () => history.back() || showSection(mainSection);

    // Cargar campos Moneda disponibles
    try {
      const resCampos = await fetch(`${BASE}/api/admin/config-umbral-lider/campos-moneda`);
      if (resCampos.ok) {
        const campos = await resCampos.json();
        campoSelect.innerHTML = '<option value="">— Sin configurar (desactivado) —</option>';
        campos.forEach(c => {
          const opt = document.createElement("option");
          opt.value = c.codigo;
          opt.textContent = `[${c.codigo}] ${c.nombre}`;
          campoSelect.appendChild(opt);
        });
      }
    } catch { /* ignorar */ }

    // Cargar configuración actual
    try {
      const resCfg = await fetch(`${BASE}/api/config-umbral-lider`);
      if (resCfg.ok) {
        const cfg = await resCfg.json();
        if (cfg.activo && cfg.campo_codigo) {
          campoSelect.value  = cfg.campo_codigo;
          valorInput.value   = cfg.umbral !== null ? cfg.umbral : "";
          _mostrarEstadoUmbral(statusEl, true, cfg.campo_codigo, cfg.umbral);
        } else {
          _mostrarEstadoUmbral(statusEl, false);
        }
      }
    } catch { /* ignorar */ }

    // Botón guardar
    if (btnSave) btnSave.onclick = async () => {
      const campo  = (campoSelect.value || "").trim();
      const umbral = parseFloat(valorInput.value);
      if (!campo) {
        showToast("Seleccione un campo Moneda para la configuración.", "error");
        return;
      }
      if (isNaN(umbral) || umbral < 0) {
        showToast("Ingrese un valor de umbral válido (número ≥ 0).", "error");
        return;
      }
      try {
        const res  = await fetch(`${BASE}/api/admin/config-umbral-lider`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campo_codigo: campo, umbral, activo: true }),
        });
        const data = await res.json();
        if (res.ok) {
          showToast("✅ Configuración guardada correctamente.", "success");
          _mostrarEstadoUmbral(statusEl, true, campo, umbral);
          // Refrescar config en memoria para que el FE la use inmediatamente
          _umbralLiderConfig = { campo_codigo: campo, umbral, activo: true };
        } else {
          showToast(data.detail || "Error al guardar.", "error");
        }
      } catch {
        showToast("Error de conexión al guardar la configuración.", "error");
      }
    };

    // Botón desactivar
    if (btnDisable) btnDisable.onclick = async () => {
      if (!confirm("¿Desea desactivar el acceso extendido de Lider a campos Contralor?")) return;
      try {
        const res  = await fetch(`${BASE}/api/admin/config-umbral-lider`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campo_codigo: "", activo: false }),
        });
        const data = await res.json();
        if (res.ok) {
          showToast("Configuración desactivada.", "success");
          campoSelect.value = "";
          valorInput.value  = "";
          _mostrarEstadoUmbral(statusEl, false);
          _umbralLiderConfig = null;
        } else {
          showToast(data.detail || "Error al desactivar.", "error");
        }
      } catch {
        showToast("Error de conexión.", "error");
      }
    };
  }

  function _mostrarEstadoUmbral(el, activo, campo, umbral) {
    if (!el) return;
    el.style.display = "block";
    if (activo) {
      el.style.background = "var(--success-bg, #e6f4ea)";
      el.style.color      = "var(--success, #1e7e34)";
      el.style.border     = "1px solid var(--success, #1e7e34)";
      el.innerHTML = `✅ <strong>Activo</strong> — Campo: <code>${campo}</code> · Umbral: <strong>${Number(umbral).toLocaleString("es-CO")}</strong>`;
    } else {
      el.style.background = "var(--warning-bg, #fff3cd)";
      el.style.color      = "var(--warning-dark, #856404)";
      el.style.border     = "1px solid var(--warning, #ffc107)";
      el.innerHTML = "⚠️ <strong>Sin configurar</strong> — El acceso extendido de Lider a campos Contralor está desactivado.";
    }
  }

  async function loadAdminLists() {
    adminDetail.classList.add("hidden");
    adminListsGrid.classList.remove("hidden");
    adminListsGrid.innerHTML = '<p style="text-align:center;color:var(--text-muted);">Cargando listas...</p>';

    try {
      const res = await fetch("/api/admin/listas");
      const listas = await res.json();
      adminListsGrid.innerHTML = "";

      for (const lista of listas) {
        const card = document.createElement("div");
        card.className = "admin-list-card";
        card.innerHTML =
          `<div class="admin-list-info">` +
          `<h4>${escapeHtml(lista.nombre)}</h4>` +
          `<span class="field-code">[${lista.codigo}]</span>` +
          `</div>` +
          `<div class="admin-list-stats">` +
          `<span class="admin-stat-pill">${lista.activos} activas</span>` +
          `<span class="admin-stat-pill admin-stat-muted">${lista.total} total</span>` +
          `</div>`;
        card.addEventListener("click", () => openAdminDetail(lista.codigo, lista.nombre));
        adminListsGrid.appendChild(card);
      }
    } catch {
      adminListsGrid.innerHTML = '<p style="text-align:center;color:var(--error);">Error al cargar listas.</p>';
    }
  }

  async function openAdminDetail(codigo, nombre) {
    currentAdminCodigo = codigo;
    adminDetailTitle.textContent = nombre;
    adminDetailCode.textContent = `[${codigo}]`;
    adminNewOption.value = "";
    adminSearchOptions.value = "";

    adminListsGrid.classList.add("hidden");
    adminDetail.classList.remove("hidden");

    await loadAdminOptions();
  }

  async function loadAdminOptions() {
    try {
      const res = await fetch(`/api/admin/listas/${encodeURIComponent(currentAdminCodigo)}`);
      currentAdminOptions = await res.json();
      renderAdminOptions(currentAdminOptions);
    } catch {
      adminOptionsList.innerHTML = '<p style="color:var(--error);">Error al cargar opciones.</p>';
    }
  }

  function renderAdminOptions(options) {
    adminOptionsList.innerHTML = "";
    adminOptionsCount.textContent = `${options.length} opcion${options.length !== 1 ? "es" : ""}`;

    if (options.length === 0) {
      adminOptionsList.innerHTML = '<p class="admin-empty">No hay opciones en esta lista.</p>';
      return;
    }

    for (const opt of options) {
      const row = document.createElement("div");
      row.className = `admin-option-row ${opt.activo ? "" : "admin-option-inactive"}`;
      row.innerHTML =
        `<span class="admin-option-text">${escapeHtml(opt.valor)}</span>` +
        `<div class="admin-option-actions">` +
        `<button class="btn-toggle-opt" title="${opt.activo ? 'Desactivar' : 'Activar'}">${opt.activo ? '&#10003;' : '&#10060;'}</button>` +
        `<button class="btn-delete-opt" title="Eliminar">&#128465;</button>` +
        `</div>`;

      row.querySelector(".btn-toggle-opt").addEventListener("click", async (e) => {
        e.stopPropagation();
        await toggleOption(opt.id);
      });
      row.querySelector(".btn-delete-opt").addEventListener("click", async (e) => {
        e.stopPropagation();
        if (confirm(`¿Eliminar "${opt.valor}" de la lista?`)) {
          await deleteOption(opt.id);
        }
      });

      adminOptionsList.appendChild(row);
    }
  }

  async function toggleOption(id) {
    try {
      const res = await fetch(`/api/admin/listas/opcion/${id}/toggle`, { method: "PUT" });
      const data = await res.json();
      if (res.ok) {
        showToast(data.mensaje);
        await loadAdminOptions();
      } else {
        showToast(data.error || "Error", "error");
      }
    } catch { showToast("Error de conexion.", "error"); }
  }

  async function deleteOption(id) {
    try {
      const res = await fetch(`/api/admin/listas/opcion/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast(data.mensaje);
        await loadAdminOptions();
      } else {
        showToast(data.error || "Error", "error");
      }
    } catch { showToast("Error de conexion.", "error"); }
  }

  btnAddOption.addEventListener("click", async () => {
    const valor = adminNewOption.value.trim();
    if (!valor) { showToast("Escriba un valor.", "error"); return; }

    try {
      const res = await fetch(`/api/admin/listas/${encodeURIComponent(currentAdminCodigo)}/agregar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valor }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.mensaje);
        adminNewOption.value = "";
        await loadAdminOptions();
      } else {
        showToast(data.error || "Error", "error");
      }
    } catch { showToast("Error de conexion.", "error"); }
  });

  adminNewOption.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); btnAddOption.click(); }
  });

  adminSearchOptions.addEventListener("input", () => {
    const q = adminSearchOptions.value.toLowerCase().trim();
    if (!q) { renderAdminOptions(currentAdminOptions); return; }
    const filtered = currentAdminOptions.filter((o) => o.valor.toLowerCase().includes(q));
    renderAdminOptions(filtered);
  });

  // ---------------------------------------------------------------
  // NIT PRESTADOR: Autocomplete + Validation against BD_PRESTADORES
  // ---------------------------------------------------------------
  const modalOverlay = $("modal-overlay");
  const modalClose = $("modal-close");
  const btnCancelPrestador = $("btn-cancel-prestador");
  const btnSavePrestador = $("btn-save-prestador");

  // ---------------------------------------------------------------
  // FORM: Dependencia campo C → campo AG (Gestores por ciudad responsable)
  //                           → campo A  (Consecutivo por ciudad responsable)
  // ---------------------------------------------------------------
  function attachFormDependencies() {
    const fieldB = dynamicForm.querySelector("#field_B");
    const fieldC = dynamicForm.querySelector("#field_C");
    if (!fieldC) return;

    const updateGestores = async (regional, preserveValue = true) => {
      let fieldAG = dynamicForm.querySelector("#field_AG");
      if (!fieldAG) return;

      // Leer el valor guardado ANTES de cualquier conversión (solo si se pide preservar)
      const savedVal = preserveValue ? fieldAG.value : "";

      // Si field_AG es un input texto, convertirlo a select dinámico
      if (fieldAG.tagName === "INPUT") {
        const sel = document.createElement("select");
        sel.id = fieldAG.id;
        sel.name = fieldAG.name;
        sel.disabled = fieldAG.disabled;
        fieldAG.parentNode.replaceChild(sel, fieldAG);
        fieldAG = sel;
      }

      fieldAG.innerHTML = '<option value="">-- Cargando... --</option>';

      if (!regional) {
        fieldAG.innerHTML = '<option value="">-- Seleccione regional primero --</option>';
        return;
      }

      try {
        const res = await fetch(`/api/gestores-por-regional/${encodeURIComponent(regional)}`);
        const gestores = await res.json();
        fieldAG.innerHTML = '<option value="">-- Seleccione --</option>';
        for (const g of gestores) {
          const o = document.createElement("option");
          o.value = g;
          o.textContent = g;
          fieldAG.appendChild(o);
        }
        if (savedVal) {
          fieldAG.value = savedVal;
          // Si el valor no está en la lista de la regional actual (histórico de otra regional),
          // inyectarlo como opción legacy para preservar el dato sin forzar un cambio.
          if (fieldAG.value !== savedVal) {
            const legacyOpt = document.createElement("option");
            legacyOpt.value = savedVal;
            legacyOpt.textContent = savedVal;
            legacyOpt.title = "Valor histórico (responsable de otra regional)";
            legacyOpt.style.fontStyle = "italic";
            legacyOpt.style.color = "#888";
            fieldAG.insertBefore(legacyOpt, fieldAG.options[1] || null);
            fieldAG.value = savedVal;
          }
        }
      } catch {
        fieldAG.innerHTML = '<option value="">-- Error al cargar --</option>';
      }
    };

    // ---- Campo A: prefijo de consecutivo dinámico según regional (B) ----
    // Solo aplica en modo creación (currentEditId === null)
    const updateConsecutivoField = async (ciudad) => {
      if (currentEditId !== null) return; // edición: no tocar campo A
      let fieldA = dynamicForm.querySelector("#field_A");
      if (!fieldA) return;

      if (!ciudad) {
        // Sin ciudad: limpiar y dejar como input readonly
        if (fieldA.tagName === "SELECT") {
          const inp = document.createElement("input");
          inp.type = "text"; inp.id = "field_A"; inp.name = "field_A";
          inp.readOnly = true; inp.value = "";
          inp.style.background = "#f0f4fa"; inp.style.color = "#555";
          fieldA.parentNode.replaceChild(inp, fieldA);
        } else {
          fieldA.value = "";
        }
        return;
      }

      try {
        const res = await fetch(`/api/ciudad-codigos/por-ciudad?ciudad=${encodeURIComponent(ciudad)}`);
        const codigos = await res.json();
        const anio = new Date().getFullYear();

        if (!codigos.length) {
          // Sin código configurado
          if (fieldA.tagName === "SELECT") {
            const inp = document.createElement("input");
            inp.type = "text"; inp.id = "field_A"; inp.name = "field_A";
            inp.readOnly = true; inp.value = "";
            inp.style.background = "#f0f4fa"; inp.style.color = "#555";
            fieldA.parentNode.replaceChild(inp, fieldA);
          } else {
            fieldA.value = "";
          }
        } else if (codigos.length === 1) {
          // Un solo código: input readonly mostrando el prefijo
          const prefijo = `${codigos[0]}${anio}-`;
          if (fieldA.tagName === "SELECT") {
            const inp = document.createElement("input");
            inp.type = "text"; inp.id = "field_A"; inp.name = "field_A";
            inp.readOnly = true; inp.value = prefijo;
            inp.style.background = "#f0f4fa"; inp.style.color = "#555";
            fieldA.parentNode.replaceChild(inp, fieldA);
          } else {
            fieldA.value = prefijo;
          }
        } else {
          // Múltiples códigos: convertir a select
          const currentVal = fieldA.value;
          const sel = document.createElement("select");
          sel.id = "field_A"; sel.name = "field_A";
          sel.style.background = "#f0f4fa"; sel.style.color = "#555";
          for (const cod of codigos) {
            const opt = document.createElement("option");
            opt.value = `${cod}${anio}-`;
            opt.textContent = `${cod}${anio}- (${cod})`;
            sel.appendChild(opt);
          }
          if (fieldA.tagName !== "SELECT") {
            fieldA.parentNode.replaceChild(sel, fieldA);
          } else {
            fieldA.innerHTML = sel.innerHTML;
          }
          // Restaurar selección previa si coincide
          if (currentVal) {
            const sel2 = dynamicForm.querySelector("#field_A");
            if (sel2) sel2.value = currentVal;
          }
        }
      } catch (_) {}
    };

    // field_C (CIUDAD RESPONSABLE) → actualiza gestores (AG) y consecutivo (A)
    fieldC.addEventListener("change", () => {
      updateGestores(fieldC.value, false);
      updateConsecutivoField(fieldC.value);
    });
    if (fieldC.value) {
      updateGestores(fieldC.value, true);
      if (currentEditId === null) updateConsecutivoField(fieldC.value);
    }

    // ---- Filtro J: "PRUEBAS COVID" solo disponible cuando C = "BOGOTA" ----
    function _filterJCovid() {
      const jEl = dynamicForm.querySelector("#field_J");
      const cEl = dynamicForm.querySelector("#field_C");
      if (!jEl || jEl.tagName !== "SELECT") return;
      const esBogota = ((cEl ? cEl.value : "") || "").trim().toUpperCase() === "BOGOTA";
      for (const opt of jEl.options) {
        if (opt.value === "PRUEBAS COVID") {
          opt.disabled = !esBogota;
          opt.style.display = esBogota ? "" : "none";
        }
      }
      // Si "PRUEBAS COVID" está seleccionado pero C ya no es BOGOTA, limpiar J
      if (!esBogota && (jEl.value || "").trim() === "PRUEBAS COVID") {
        jEl.value = "";
        jEl.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    // Aplicar al cargar y cada vez que C cambie
    _filterJCovid();
    if (fieldC) fieldC.addEventListener("change", _filterJCovid);

    // ---- Visibilidad AA: solo visible cuando J = "PRUEBAS COVID" ----
    function _toggleAACovid() {
      const jEl  = dynamicForm.querySelector("#field_J");
      const aaEl = dynamicForm.querySelector("#field_AA");
      if (!aaEl) return;
      const esCovid = ((jEl ? jEl.value : "") || "").trim() === "PRUEBAS COVID";
      const wrapper = aaEl.closest(".field-group") || aaEl.closest(".field-row") || aaEl.parentElement;
      if (esCovid) {
        aaEl.disabled = false;
        if (wrapper) wrapper.style.display = "";
      } else {
        aaEl.disabled = true;
        aaEl.value = "";
        if (wrapper) wrapper.style.display = "none";
      }
    }

    // Aplicar al cargar y cada vez que J cambie
    _toggleAACovid();
    const fieldJ = dynamicForm.querySelector("#field_J");
    if (fieldJ) fieldJ.addEventListener("change", _toggleAACovid);
  }

  // ---------------------------------------------------------------
  // FORM: Reglas de campos — dependencias y obligatorios
  // ---------------------------------------------------------------
  let _allCampoRules = [];  // cargado una vez tras login: [{codigo, nombre, requerido_*, dependencias}]

  async function loadCampoRules() {
    try {
      const res = await fetch("/api/campo-reglas");
      if (res.ok) _allCampoRules = await res.json();
    } catch (_) {}
  }

  /**
   * Aplica reglas de dependencia (deshabilitar) para los campos del formulario actual.
   * Usa _allCampoRules para obtener las reglas de cada campo visible en el form.
   */
  function applyFieldRules() {
    // Construir mapa codigo → reglas solo para campos que están en el form ahora
    const codigosEnForm = new Set(
      [...dynamicForm.querySelectorAll("[name^='field_']")].map(el => el.name.replace("field_", ""))
    );
    const _formFieldRules = _allCampoRules.filter(r => codigosEnForm.has(r.codigo));

    // Evaluar si un campo debe estar deshabilitado por sus dependencias
    function evalDependency(codigoOrigen) {
      const meta = _formFieldRules.find(f => f.codigo === codigoOrigen);
      if (!meta || !meta.dependencias) return false; // sin dependencias → no deshabilitar
      let dep;
      try { dep = JSON.parse(meta.dependencias); } catch (_) { return false; }
      const codigosDep = dep.campos || [];
      const operador   = (dep.operador || "AND").toUpperCase();
      if (!codigosDep.length) return false;

      const resultados = codigosDep.map(cod => {
        const el = dynamicForm.querySelector(`[name="field_${cod}"]`);
        return el ? el.value.trim() !== "" : false;
      });

      if (operador === "OR") return !resultados.some(Boolean);   // deshabilitar si NINGUNO tiene valor
      return !resultados.every(Boolean);                          // deshabilitar si ALGUNO está vacío (AND)
    }

    function reEvalAll() {
      for (const meta of _formFieldRules) {
        if (!meta.dependencias) continue;
        const el = dynamicForm.querySelector(`[name="field_${meta.codigo}"]`);
        if (!el) continue;
        const shouldDisable = evalDependency(meta.codigo);
        el.disabled = shouldDisable;
        if (shouldDisable) el.value = ""; // limpiar valor si se deshabilita
        // Indicador visual
        const wrapper = el.closest(".field-row") || el.parentElement;
        if (wrapper) wrapper.style.opacity = shouldDisable ? "0.45" : "";
      }
    }

    // Aplicar estado inicial
    reEvalAll();

    // Escuchar cambios en CUALQUIER campo del formulario para re-evaluar dependencias
    dynamicForm.addEventListener("input",  reEvalAll);
    dynamicForm.addEventListener("change", reEvalAll);
  }

  /**
   * Valida campos obligatorios según la sección actual.
   * @param {"crear"|"g2_lider"|"contralor"} seccion
   * @returns {string[]} lista de nombres de campos faltantes
   */
  /** Elimina todas las marcas de error del formulario dinámico (inicio de cada intento de guardado). */
  function _clearAllFieldErrors() {
    if (!dynamicForm) return;
    dynamicForm.querySelectorAll(".field-required-error").forEach(el => {
      el.classList.remove("field-required-error");
    });
    dynamicForm.querySelectorAll(".field-order-error-msg").forEach(el => el.remove());
  }

  // Errores de ORDEN entre fechas (O>N, P>O, etc.)
  // Usa selector :not(.field-date-invalid-msg) para nunca pisar spans de fecha inválida.
  function _setFieldOrderError(el, msg) {
    el.classList.add("field-required-error");
    const wrap = el.closest(".field-input-wrap");
    if (!wrap) return;
    let span = wrap.querySelector(".field-order-error-msg:not(.field-date-invalid-msg)");
    if (!span) {
      span = document.createElement("span");
      span.className = "field-order-error-msg";
      wrap.appendChild(span);
    }
    span.textContent = msg;
  }

  function _clearFieldOrderError(el) {
    el.classList.remove("field-required-error");
    const wrap = el.closest(".field-input-wrap");
    wrap?.querySelector(".field-order-error-msg:not(.field-date-invalid-msg)")?.remove();
  }

  // Errores de FECHA INVÁLIDA (badInput: ej. 31/04/2026)
  // Span con clase adicional field-date-invalid-msg para distinguirlo de errores de orden.
  function _setDateInvalidError(el) {
    el.classList.add("field-required-error");
    const wrap = el.closest(".field-input-wrap");
    if (!wrap) return;
    if (!wrap.querySelector(".field-date-invalid-msg")) {
      const span = document.createElement("span");
      span.className = "field-order-error-msg field-date-invalid-msg";
      span.textContent = "Fecha inválida";
      wrap.appendChild(span);
    }
  }

  function _clearDateInvalidError(el) {
    const wrap = el.closest(".field-input-wrap");
    const span = wrap?.querySelector(".field-date-invalid-msg");
    if (!span) return; // sin error de fecha inválida activo, no tocar nada
    span.remove();
    // Quitar clase solo si no queda ningún span de error de orden activo
    if (!wrap.querySelector(".field-order-error-msg:not(.field-date-invalid-msg)")) {
      el.classList.remove("field-required-error");
    }
  }

  /** Hace scroll suave al primer campo con error visible en el formulario. */
  function _scrollToFirstError() {
    if (!dynamicForm) return;
    const first = dynamicForm.querySelector(".field-required-error");
    if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function validateRequiredFields(seccion) {
    const errors = [];
    const propKey = seccion === "crear"
      ? "requerido_crear"
      : seccion === "g2_lider"
      ? "requerido_g2_lider"
      : "requerido_contralor";

    for (const meta of _allCampoRules) {
      if (!meta[propKey]) continue;
      const el = dynamicForm.querySelector(`[name="field_${meta.codigo}"]`);
      if (!el) continue;
      if (el.disabled) continue;          // campo deshabilitado por dependencia → no validar
      const val = (el.value || "").trim();
      if (!val) {
        // Resaltar campo en rojo
        el.classList.add("field-required-error");
        el.addEventListener("input", () => el.classList.remove("field-required-error"), { once: true });
        errors.push(`[${meta.codigo}] ${meta.nombre || meta.codigo}`);
      }
    }
    return errors;
  }

  // ---------------------------------------------------------------
  // FORM: Formateo visual de campos Moneda
  // ---------------------------------------------------------------
  function _rawCurrencyValue(displayVal) {
    // Extrae número limpio de un valor posiblemente formateado ("$ 1,234.56" → "1234.56")
    return String(displayVal ?? "").replace(/[^0-9.-]/g, "");
  }

  // Formatea un decimal (0.8) como porcentaje visual ("80%"). Elimina ceros innecesarios.
  function _formatPercent(rawNum) {
    const n = parseFloat(rawNum);
    if (isNaN(n)) return rawNum;
    return parseFloat((n * 100).toFixed(4)) + "%";
  }

  function _formatCurrencyDisplay(rawVal) {
    if (rawVal === "" || rawVal == null) return "";
    const num = parseFloat(rawVal);
    if (isNaN(num)) return rawVal;
    // Separador de miles con coma; decimales solo si existen
    const hasDec = rawVal.includes(".") && !rawVal.endsWith(".");
    const formatted = num.toLocaleString("en-US", {
      minimumFractionDigits: hasDec ? 2 : 0,
      maximumFractionDigits: 2,
    });
    return "$ " + formatted;
  }

  function _attachCurrencyToInput(input) {
    // Evitar doble-attach
    if (input.dataset.currencyAttached) return;
    input.dataset.currencyAttached = "1";
    // Formatear valor inicial (viene de BD como número puro)
    if (input.value !== "") {
      const raw = _rawCurrencyValue(input.value);
      input.dataset.rawValue = raw;
      input.value = _formatCurrencyDisplay(raw);
    }
    // Campos automáticos: solo formateo inicial, sin listeners interactivos
    if (input.readOnly) return;
    // Al enfocar: mostrar número limpio para edición
    input.addEventListener("focus", () => { input.value = input.dataset.rawValue || ""; });
    // Mientras escribe: permitir solo dígitos, punto y signo menos
    input.addEventListener("input", () => {
      const cleaned = input.value.replace(/[^0-9.-]/g, "");
      if (input.value !== cleaned) input.value = cleaned;
      input.dataset.rawValue = cleaned;
    });
    // Al perder foco: mostrar valor formateado con $ y separador de miles
    input.addEventListener("blur", () => {
      const raw = _rawCurrencyValue(input.value);
      input.dataset.rawValue = raw;
      input.value = _formatCurrencyDisplay(raw);
    });
  }

  // ---------------------------------------------------------------
  // FORM: Validación fecha máx = hoy (no se permiten fechas futuras)
  // Excluidos: fechas TENTATIVAS de cuotas (BJ, BL, BN, BP, BR, BT, BV, BX,
  //            DY, EA, EC, EE, EK, EM, EO, EQ, ES, EU, EW, EY, FA, FC, FE, FG)
  //            porque deben ser futuras por definición.
  // ---------------------------------------------------------------
  const _FECHA_MAX_HOY_CAMPOS = [
    // Fechas del proceso de conciliación de cartera
    "K", "L", "N", "O", "P", "Q", "R",
    // Periodo conciliado de glosas
    "AH", "AI",
    // Fechas de acta de finiquito
    "AL", "AM",
    // Fechas de soportes y cierre
    "CC", "CD", "CG",
    // Fechas de pago REAL cuotas 1-8
    "CK", "CL", "CM", "CN", "CO", "CP", "CQ", "CR",
    // Fechas de devolución/retroalimentación (1-5)
    "DC", "DH", "DW", "FJ", "FO", "FT",
    // Fechas de pago REAL cuotas 9-12
    "EF", "EG", "EH", "EI",
    // Fechas de pago REAL cuotas 13-23
    "ET", "EU", "EV", "EW", "EX", "EY", "EZ", "FA", "FB", "FD", "FF",
    // Fecha de pago REAL cuota 24
    "FH"
  ];

  function _todayStr() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  function _validarFechaMaxHoy(input) {
    if (!input.value) { input.classList.remove("field-required-error"); return true; }
    const ok = input.value <= _todayStr();
    if (ok) {
      input.classList.remove("field-required-error");
    } else {
      input.classList.add("field-required-error");
    }
    return ok;
  }

  function _validarPeriodoKL() {
    const elK = dynamicForm.querySelector("[data-field-code='K']");
    const elL = dynamicForm.querySelector("[data-field-code='L']");
    if (!elK || !elL || !elK.value || !elL.value) return true;
    const ok = elL.value > elK.value;
    if (ok) {
      elL.classList.remove("field-required-error");
    } else {
      elL.classList.add("field-required-error");
    }
    return ok;
  }

  // Valida orden entre pares de fechas (cuando ambos tienen valor).
  // estricto=true → mayor > menor (error si mayor <= menor)
  // estricto=false → mayor >= menor (error si mayor < menor; mismo día permitido)
  // Pares: O>N, P>O, Q>P, BJ>AM, CG>N, AM>=AL
  function _validarOrdenNOPQ() {
    const _pares = [
      { menor: "N",  mayor: "O",  msg: "Debe ser mayor a [N]",          estricto: true  },
      { menor: "O",  mayor: "P",  msg: "Debe ser mayor a [O]",          estricto: true  },
      { menor: "P",  mayor: "Q",  msg: "Debe ser mayor a [P]",          estricto: true  },
      { menor: "AM", mayor: "BJ", msg: "Debe ser mayor a [AM]",         estricto: true  },
      { menor: "N",  mayor: "CG", msg: "Debe ser mayor a [N]",          estricto: true  },
      { menor: "AL", mayor: "AM", msg: "Debe ser mayor o igual a [AL]", estricto: false },
    ];
    let hayError = false;
    for (const { menor, mayor, msg, estricto } of _pares) {
      const elMenor = dynamicForm.querySelector(`[data-field-code="${menor}"]`);
      const elMayor = dynamicForm.querySelector(`[data-field-code="${mayor}"]`);
      if (!elMenor || !elMayor || !elMenor.value || !elMayor.value) {
        if (elMayor) _clearFieldOrderError(elMayor);
        continue;
      }
      const hayErrorPar = estricto
        ? elMayor.value <= elMenor.value
        : elMayor.value < elMenor.value;
      if (hayErrorPar) {
        _setFieldOrderError(elMayor, msg);
        hayError = true;
      } else {
        _clearFieldOrderError(elMayor);
      }
    }
    return !hayError;
  }

  function attachFechaMaxHoyValidation() {
    _FECHA_MAX_HOY_CAMPOS.forEach(cod => {
      const el = dynamicForm.querySelector(`[data-field-code="${cod}"]`);
      if (!el) return;
      el.addEventListener("change", () => {
        if (!_validarFechaMaxHoy(el)) {
          showToast(`La fecha del campo [${cod}] no puede ser mayor al día de hoy.`, "error");
        }
        if (cod === "K" || cod === "L") {
          if (!_validarPeriodoKL()) {
            showToast("PERIODO RECLAMADO HASTA [L] debe ser mayor a PERIODO RECLAMADO DESDE [K].", "error");
          }
        }
        if (cod === "N" || cod === "AL") {
          _validarOrdenNOPQ();
        }
      });
      // Validar valor inicial si ya viene cargado (modo edición)
      _validarFechaMaxHoy(el);
    });
    // Listeners para O, P, Q, AM, CG (no están en _FECHA_MAX_HOY_CAMPOS pero requieren validación de orden)
    for (const cod of ["O", "P", "Q", "AM", "CG"]) {
      const el = dynamicForm.querySelector(`[data-field-code="${cod}"]`);
      if (!el) continue;
      el.addEventListener("change", () => _validarOrdenNOPQ());
    }
    // Validar orden K < L en carga inicial (modo edición)
    _validarPeriodoKL();
    // Validar orden N < O < P < Q en carga inicial (modo edición)
    _validarOrdenNOPQ();

    // Detectar fechas inválidas escritas manualmente (ej. 31/04/2026)
    dynamicForm.querySelectorAll('input[type="date"]').forEach(el => {
      if (el.disabled || el.readOnly) return;
      el.addEventListener("change", () => {
        if (el.validity.badInput) {
          _setDateInvalidError(el);
        } else {
          _clearDateInvalidError(el);
        }
      });
    });
  }

  function attachCurrencyInputs() {
    dynamicForm.querySelectorAll("[data-currency='true']").forEach(_attachCurrencyToInput);
  }

  let nitAutocompleteTimeout = null;
  let nitDropdown = null;
  let selectedSuggestionIdx = -1;

  function _checkRegionalNitMismatch(nitRegional) {
    if (!nitRegional) return;
    const fieldB = document.querySelector("[data-field-code='B']");
    if (!fieldB) return;
    const currentVal = (fieldB.value || "").trim().toUpperCase();
    const nitVal     = nitRegional.trim().toUpperCase();
    if (!currentVal || currentVal === nitVal) return;

    const overlay = $("regional-nit-mismatch-overlay");
    const msg     = $("regional-nit-mismatch-msg");
    const btnCambiar  = $("btn-regional-nit-cambiar");
    const btnCancelar = $("btn-regional-nit-cancelar");
    if (!overlay) return;

    // Verificar si el valor del NIT existe en las opciones de campo B
    const existeEnLista = fieldB.tagName === "SELECT"
      ? Array.from(fieldB.options).some(o => o.value.trim().toUpperCase() === nitVal)
      : false;

    if (existeEnLista) {
      msg.textContent = `La regional del prestador ("${nitRegional}") es diferente a la regional seleccionada en REGIONAL IPS ("${fieldB.value}"). ¿Desea cambiar REGIONAL IPS al valor del NIT?`;
      btnCambiar.classList.remove("hidden");
      const handler = () => {
        const matched = Array.from(fieldB.options).find(o => o.value.trim().toUpperCase() === nitVal);
        if (matched) {
          fieldB.value = matched.value;
          fieldB.dispatchEvent(new Event("change"));
        }
        overlay.classList.add("hidden");
        btnCambiar.removeEventListener("click", handler);
      };
      btnCambiar.addEventListener("click", handler);
    } else {
      msg.textContent = `La regional del prestador ("${nitRegional}") es diferente a la regional seleccionada en REGIONAL IPS ("${fieldB.value}"), pero esa regional no existe en la lista. Se mantendrá el valor actual.`;
      btnCambiar.classList.add("hidden");
    }

    btnCancelar.onclick = () => overlay.classList.add("hidden");
    overlay.classList.remove("hidden");
  }

  function attachNitValidation() {
    const nitInput = $("field_E");
    if (!nitInput) return;

    // Wrap input in a relative container for dropdown positioning
    const parent = nitInput.parentElement;
    parent.style.position = "relative";

    // Create dropdown element
    nitDropdown = document.createElement("div");
    nitDropdown.id = "nit-autocomplete-dropdown";
    nitDropdown.className = "nit-dropdown hidden";
    parent.appendChild(nitDropdown);

    nitInput.setAttribute("autocomplete", "off");

    nitInput.addEventListener("input", () => {
      clearTimeout(nitAutocompleteTimeout);
      selectedSuggestionIdx = -1;

      const nit = nitInput.value.trim();

      if (nit.length < 3) {
        hideDropdown();
        return;
      }

      // Autocomplete: fast, short delay
      nitAutocompleteTimeout = setTimeout(() => fetchSuggestions(nit), 250);
    });

    nitInput.addEventListener("blur", () => {
      // Small delay to allow click on dropdown item
      setTimeout(() => hideDropdown(), 200);
    });

    nitInput.addEventListener("keydown", (e) => {
      if (!nitDropdown || nitDropdown.classList.contains("hidden")) return;
      const items = nitDropdown.querySelectorAll(".nit-suggestion");
      if (items.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        selectedSuggestionIdx = Math.min(selectedSuggestionIdx + 1, items.length - 1);
        highlightSuggestion(items);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        selectedSuggestionIdx = Math.max(selectedSuggestionIdx - 1, 0);
        highlightSuggestion(items);
      } else if (e.key === "Enter" && selectedSuggestionIdx >= 0) {
        e.preventDefault();
        items[selectedSuggestionIdx].click();
      } else if (e.key === "Escape") {
        hideDropdown();
      }
    });
  }

  function highlightSuggestion(items) {
    items.forEach((it, i) => {
      it.classList.toggle("nit-suggestion-active", i === selectedSuggestionIdx);
    });
  }

  async function fetchSuggestions(prefix) {
    try {
      const res = await fetch(`/api/prestadores/autocompletar/${encodeURIComponent(prefix)}`);
      const data = await res.json();

      if (data.length === 0) {
        nitDropdown.innerHTML = `
          <div class="nit-no-results">Sin coincidencias para "${escapeHtml(prefix)}"</div>
          <div class="nit-solicitud-wrap">
            <button class="nit-solicitar-btn" data-nit="${escapeHtml(prefix)}">
              + Solicitar creaci\u00f3n al administrador
            </button>
          </div>`;
        nitDropdown.querySelector(".nit-solicitar-btn")?.addEventListener("mousedown", (e) => {
          e.preventDefault();
          nitDropdown.classList.add("hidden");
          openSolicitudModal(prefix);
        });
        nitDropdown.classList.remove("hidden");
        return;
      }

      selectedSuggestionIdx = -1;
      nitDropdown.innerHTML = "";
      data.forEach((item, idx) => {
        const div = document.createElement("div");
        div.className = "nit-suggestion";
        div.innerHTML =
          `<span class="nit-sug-nit">${highlightMatch(item.nit, prefix)}</span>` +
          `<span class="nit-sug-name">${escapeHtml(item.nombre)}</span>` +
          `<span class="nit-sug-loc">${escapeHtml(item.ciudad || '')}${item.regional ? ' \u00B7 ' + escapeHtml(item.regional) : ''}</span>`;
        div.addEventListener("mousedown", (e) => {
          e.preventDefault(); // Prevent blur
          const nitInput = $("field_E");
          nitInput.value = item.nit;
          hideDropdown();
          // Auto-fill TIPO PER (H) y NOMBRE SUCURSAL (I)
          autoFillPrestadorFields(item.nit);
        });
        div.addEventListener("mouseenter", () => {
          selectedSuggestionIdx = idx;
          highlightSuggestion(nitDropdown.querySelectorAll(".nit-suggestion"));
        });
        nitDropdown.appendChild(div);
      });

      nitDropdown.classList.remove("hidden");
    } catch {
      hideDropdown();
    }
  }

  function highlightMatch(text, prefix) {
    const escaped = escapeHtml(prefix);
    const escapedText = escapeHtml(text);
    return escapedText.replace(escaped, `<strong>${escaped}</strong>`);
  }

  function hideDropdown() {
    if (nitDropdown) {
      nitDropdown.classList.add("hidden");
      nitDropdown.innerHTML = "";
    }
    selectedSuggestionIdx = -1;
  }

  // Auto-fill TIPO PER (H) y NOMBRE SUCURSAL (I) cuando se selecciona un NIT
  async function autoFillPrestadorFields(nit) {
    try {
      const res = await fetch(`/api/prestadores/buscar/${encodeURIComponent(nit)}`);
      const data = await res.json();

      if (data.encontrado && data.prestadores.length > 0) {
        const prestador = data.prestadores[0]; // Usar el primero si hay múltiples
        const fieldH = $("field_H");
        const fieldI = $("field_I");
        const fieldF = $("field_F");

        if (fieldH) fieldH.value = prestador.tipo_persona || "";
        if (fieldI) fieldI.value = prestador.nombre || "";
        if (fieldF && prestador.ciudad) {
          const val = prestador.ciudad;
          if (fieldF.tagName === "SELECT") {
            const valNorm = val.trim().toUpperCase();
            let matched = Array.from(fieldF.options).find(o => o.value === val);
            if (!matched) matched = Array.from(fieldF.options).find(o => o.value.trim().toUpperCase() === valNorm);
            if (matched) {
              fieldF.value = matched.value;
            } else {
              const opt = document.createElement("option");
              opt.value = val;
              opt.textContent = val;
              fieldF.appendChild(opt);
              fieldF.value = val;
            }
          } else {
            fieldF.value = val;
          }
        }
        _checkRegionalNitMismatch(prestador.regional);
      }
    } catch (err) {
      console.error("Error al auto-llenar campos del prestador:", err);
    }
  }

  function openNewPrestadorModal(nit) {
    $("np-nit").value = nit;
    $("np-dv").value = "";
    $("np-nombre").value = "";
    $("np-ciudad").value = "";
    $("np-departamento").value = "";
    $("np-regional").value = "";
    $("np-direccion").value = "";
    $("np-telefono").value = "";
    $("np-correo").value = "";
    $("np-tipo").value = "";
    modalOverlay.classList.remove("hidden");
  }

  function closeModal() {
    modalOverlay.classList.add("hidden");
  }

  modalClose.addEventListener("click", closeModal);
  btnCancelPrestador.addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  btnSavePrestador.addEventListener("click", async () => {
    const nit = $("np-nit").value.trim();
    const nombre = $("np-nombre").value.trim();

    if (!nit || !nombre) {
      showToast("NIT y Nombre son obligatorios.", "error");
      return;
    }

    try {
      const res = await fetch("/api/prestadores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nit,
          digito_verificacion: $("np-dv").value.trim(),
          nombre,
          ciudad: $("np-ciudad").value.trim(),
          departamento: $("np-departamento").value.trim(),
          regional: $("np-regional").value.trim(),
          direccion: $("np-direccion").value.trim(),
          telefono: $("np-telefono").value.trim(),
          correo: $("np-correo").value.trim(),
          tipo_prestador: $("np-tipo").value.trim(),
        }),
      });
      const data = await res.json();

      if (res.ok) {
        showToast("Prestador registrado exitosamente.");
        closeModal();
      } else {
        showToast(data.error || "Error al crear prestador.", "error");
      }
    } catch {
      showToast("Error de conexion.", "error");
    }
  });

  // ---------------------------------------------------------------
  // ADMIN: User Management
  // ---------------------------------------------------------------
  let allUsers = [];
  let currentRenderedUsers = [];
  let editingUserId = null;

  $("btn-users-back").addEventListener("click", () => showSection(mainSection));

  async function loadUsers() {
    const res = await fetch("/api/admin/usuarios");
    if (!res.ok) { showToast("Error al cargar usuarios", "error"); return; }
    allUsers = await res.json();
    $("users-search").value = "";
    renderUsers(allUsers);
  }

  function renderUsers(users) {
    currentRenderedUsers = users;
    $("users-count").textContent = `${users.length} usuario${users.length !== 1 ? "s" : ""}`;
    const tbody = $("users-tbody");
    tbody.innerHTML = "";

    const PERM_LABELS = {
      perm_gestor_1: "G1", perm_gestor_2: "G2",
      perm_lider: "Líder", perm_contralor: "Contralor",
    };
    const PERM_COLORS = {
      perm_gestor_1: "#0B7A75", perm_gestor_2: "#1565C0",
      perm_lider: "#6A1B9A", perm_contralor: "#BF360C",
    };

    for (const u of users) {
      const perms = Object.entries(PERM_LABELS)
        .filter(([k]) => u[k])
        .map(([k, lbl]) => `<span class="user-perm-badge" style="background:${PERM_COLORS[k]}20;color:${PERM_COLORS[k]};border:1px solid ${PERM_COLORS[k]}40">${lbl}</span>`)
        .join(" ");

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(u.nombre_completo)}</strong></td>
        <td class="user-email">${escapeHtml(u.usuario)}</td>
        <td>${escapeHtml(u.cargo || "—")}</td>
        <td>${escapeHtml(u.regional || "—")}</td>
        <td>${perms || '<span class="text-muted">Sin permisos</span>'}</td>
        <td>${u.is_admin ? '<span class="badge-admin">Admin</span>' : "—"}</td>
        <td><span class="status-badge ${u.activo ? "status-active" : "status-inactive"}">${u.activo ? "Activo" : "Inactivo"}</span></td>
        <td style="white-space:nowrap">
          <div style="display:flex;align-items:center;justify-content:flex-end;gap:5px">
            <button class="btn-keralty-action btn-user-edit">Editar</button>
            <button class="btn-keralty-action danger btn-user-delete">Eliminar</button>
          </div>
        </td>`;
      tr.querySelector(".btn-user-edit").addEventListener("click", () => openUserModal(u));
      tr.querySelector(".btn-user-delete").addEventListener("click", async () => {
        if (!confirm(`¿Eliminar al usuario "${u.nombre_completo}"? Esta acción no se puede deshacer.`)) return;
        const res = await fetch(`/api/admin/usuarios/${u.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) { showToast(data.detail || "Error al eliminar", "error"); return; }
        showToast(data.mensaje || "Usuario eliminado");
        await loadUsers();
      });
      tbody.appendChild(tr);
    }
  }

  $("users-search").addEventListener("input", () => {
    const q = $("users-search").value.toLowerCase().trim();
    if (!q) { renderUsers(allUsers); return; }
    renderUsers(allUsers.filter(u =>
      [u.nombre_completo, u.usuario, u.cargo, u.regional].some(v => v && v.toLowerCase().includes(q))
    ));
  });

  $("btn-exportar-usuarios").addEventListener("click", () => {
    const ids = currentRenderedUsers.map(u => u.id).join(",");
    window.location.href = `${BASE}/api/admin/usuarios/exportar?ids=${ids}`;
  });

  // ── Superior inmediato: lógica dinámica ────────────────────────────────────
  // Prioridad de permisos: admin > contralor > lider > gestor2 > gestor1
  function _getHighestPermiso() {
    if ($("uf-admin").checked)     return "admin";
    if ($("uf-contralor").checked) return "contralor";
    if ($("uf-lider").checked)     return "lider";
    if ($("uf-g2").checked || $("uf-g1").checked) return "gestor";
    return null;
  }

  async function _refreshSuperiorDropdown(valorActual = "") {
    const sel      = $("uf-superior");
    const regional = $("uf-regional").value;
    const permiso  = _getHighestPermiso();

    // Contralor, admin o sin permiso: deshabilitar y limpiar
    if (!permiso || permiso === "contralor" || permiso === "admin") {
      sel.innerHTML = '<option value="">— Sin superior —</option>';
      sel.disabled  = true;
      return;
    }

    sel.disabled  = false;
    sel.innerHTML = '<option value="">Cargando...</option>';

    try {
      const res  = await fetch(`${BASE}/api/admin/usuarios/superiores?regional=${encodeURIComponent(regional)}&permiso=${permiso}`);
      const data = await res.json();

      sel.innerHTML = "";
      if (!data.length) {
        sel.innerHTML = '<option value="">— No hay candidatos disponibles —</option>';
        return;
      }

      // Separar misma regional vs otras (el endpoint ya devuelve misma regional primero)
      const mismaReg = data.filter(u => (u.regional || "").toUpperCase() === regional.toUpperCase());
      const otras    = data.filter(u => (u.regional || "").toUpperCase() !== regional.toUpperCase());

      const addOpt = (u) => {
        const opt = document.createElement("option");
        opt.value       = u.usuario;
        opt.textContent = u.nombre_completo + (u.regional ? ` (${u.regional})` : "");
        sel.appendChild(opt);
      };

      mismaReg.forEach(addOpt);
      if (mismaReg.length && otras.length) {
        const sep = document.createElement("option");
        sep.disabled = true;
        sep.textContent = "── Otras regionales ──";
        sel.appendChild(sep);
      }
      otras.forEach(addOpt);

      // Restaurar valor previo si existe en la lista
      if (valorActual) sel.value = valorActual;
    } catch {
      sel.innerHTML = '<option value="">— Error al cargar —</option>';
    }
  }

  // Limpiar error visual al corregir el campo
  ["uf-nombre", "uf-usuario", "uf-password"].forEach(id => {
    $(id).addEventListener("input", () => {
      const field = $(id)?.closest(".modal-field");
      if (field) { field.classList.remove("field-invalid"); field.querySelector(".field-error-msg")?.remove(); }
    });
  });

  // Actualizar dropdown al cambiar regional o cualquier permiso
  ["uf-regional", "uf-g1", "uf-g2", "uf-lider", "uf-contralor", "uf-admin"].forEach(id => {
    $(id).addEventListener("change", () => {
      // Limpiar error de regional al seleccionar
      if (id === "uf-regional") {
        const field = $(id)?.closest(".modal-field");
        if (field) { field.classList.remove("field-invalid"); field.querySelector(".field-error-msg")?.remove(); }
      }
      // Limpiar error de permisos al marcar alguno
      if (["uf-g1","uf-g2","uf-lider","uf-contralor","uf-admin"].includes(id)) {
        $("user-form-perms-wrap")?.classList.remove("perms-invalid");
      }
      _refreshSuperiorDropdown($("uf-superior").value);
    });
  });

  async function openUserModal(user = null) {
    editingUserId = user ? user.id : null;
    $("user-modal-title").textContent = user ? "Editar Usuario" : "Nuevo Usuario";
    $("uf-pass-hint").textContent = user ? "(dejar vacío para no cambiar)" : "(requerida)";

    // Fill fields
    $("uf-nombre").value    = user?.nombre_completo || "";
    $("uf-usuario").value   = user?.usuario || "";
    $("uf-usuario").disabled = !!user;
    $("uf-cedula").value    = user?.cedula || "";
    $("uf-cargo").value     = user?.cargo || "";
    $("uf-regional").value  = user?.regional || "";
    $("uf-password").value  = "";
    $("uf-g1").checked       = !!(user?.perm_gestor_1);
    $("uf-g2").checked       = !!(user?.perm_gestor_2);
    $("uf-lider").checked    = !!(user?.perm_lider);
    $("uf-contralor").checked= !!(user?.perm_contralor);
    $("uf-admin").checked    = !!(user?.is_admin);
    $("uf-activo").checked   = user ? !!user.activo : true;

    // Toggle local_auth_enabled — admin siempre tiene acceso con contraseña (no editable)
    const localAuthEl = $("uf-local-auth");
    if (localAuthEl) {
      localAuthEl.checked  = user ? !!user.local_auth_enabled : false;
      localAuthEl.disabled = !!(user?.is_admin); // admin no puede desactivarse
    }

    _clearUserValidation();

    // Cargar dropdown de superior y restaurar valor guardado
    await _refreshSuperiorDropdown(user?.superior_inmediato || "");

    $("user-modal-overlay").classList.remove("hidden");
  }

  function closeUserModal() {
    $("user-modal-overlay").classList.add("hidden");
    editingUserId = null;
  }

  $("user-modal-close").addEventListener("click", closeUserModal);
  $("btn-cancel-user").addEventListener("click", closeUserModal);
  $("user-modal-overlay").addEventListener("click", (e) => {
    if (e.target === $("user-modal-overlay")) closeUserModal();
  });

  $("btn-new-user").addEventListener("click", () => openUserModal(null));

  function _clearUserValidation() {
    ["uf-nombre", "uf-usuario", "uf-regional", "uf-password"].forEach(id => {
      const el = $(id);
      const field = el?.closest(".modal-field");
      if (field) {
        field.classList.remove("field-invalid");
        field.querySelector(".field-error-msg")?.remove();
      }
    });
    $("user-form-perms-wrap")?.classList.remove("perms-invalid");
  }

  function _markInvalid(id, msg) {
    const el = $(id);
    const field = el?.closest(".modal-field");
    if (!field) return;
    field.classList.add("field-invalid");
    if (!field.querySelector(".field-error-msg")) {
      const span = document.createElement("span");
      span.className = "field-error-msg";
      span.textContent = msg;
      field.appendChild(span);
    }
  }

  $("btn-save-user").addEventListener("click", async () => {
    const nombre   = $("uf-nombre").value.trim();
    const usuario  = $("uf-usuario").value.trim();
    const regional = $("uf-regional").value;
    const password = $("uf-password").value.trim();
    const tienePermiso = $("uf-g1").checked || $("uf-g2").checked ||
                         $("uf-lider").checked || $("uf-contralor").checked ||
                         $("uf-admin").checked;

    _clearUserValidation();
    let valido = true;

    if (!nombre)   { _markInvalid("uf-nombre",   "Campo obligatorio"); valido = false; }
    if (!usuario)  { _markInvalid("uf-usuario",  "Campo obligatorio"); valido = false; }
    if (!regional) { _markInvalid("uf-regional", "Seleccione una regional"); valido = false; }
    if (!editingUserId && !password) {
      _markInvalid("uf-password", "La contraseña es obligatoria al crear un usuario");
      valido = false;
    }
    if (!tienePermiso) {
      $("user-form-perms-wrap")?.classList.add("perms-invalid");
      valido = false;
    }

    if (!valido) { showToast("Completa los campos obligatorios marcados en rojo", "error"); return; }

    const payload = {
      nombre_completo:    nombre,
      usuario,
      cedula:             $("uf-cedula").value.trim() || null,
      cargo:              $("uf-cargo").value || null,
      regional:           $("uf-regional").value || null,
      correo:             $("uf-usuario").value.trim() || null,
      superior_inmediato: $("uf-superior").value.trim() || null,
      password:           password || null,
      perm_gestor_1:      $("uf-g1").checked,
      perm_gestor_2:      $("uf-g2").checked,
      perm_lider:         $("uf-lider").checked,
      perm_contralor:     $("uf-contralor").checked,
      is_admin:           $("uf-admin").checked,
      activo:             $("uf-activo").checked,
      local_auth_enabled: !!$("uf-local-auth")?.checked,
    };

    const url    = editingUserId ? `/api/admin/usuarios/${editingUserId}` : "/api/admin/usuarios";
    const method = editingUserId ? "PUT" : "POST";
    const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || "Error al guardar", "error"); return; }
    showToast(data.mensaje || "Usuario guardado");
    closeUserModal();
    await loadUsers();
  });

  // ---------------------------------------------------------------
  // ADMIN: Prestadores Management
  // ---------------------------------------------------------------
  let editingPrestadorId = null;
  let prestadoresSearchTimer = null;

  $("btn-prestadores-back").addEventListener("click", () => showSection(mainSection));

  async function loadPrestadores(q = "") {
    const url = q ? `/api/admin/prestadores?q=${encodeURIComponent(q)}` : "/api/admin/prestadores";
    const res = await fetch(url);
    if (!res.ok) { showToast("Error al cargar prestadores", "error"); return; }
    const data = await res.json();
    renderPrestadores(data);
  }

  let currentRenderedPrestadores = [];

  function renderPrestadores(list) {
    currentRenderedPrestadores = list;
    $("prestadores-count").textContent = `${list.length} prestador${list.length !== 1 ? "es" : ""}`;
    $("prestadores-limit-note").classList.toggle("hidden", list.length < 200);
    const tbody = $("prestadores-tbody");
    tbody.innerHTML = "";
    for (const p of list) {
      const estadoBadge = p.estado === "ACTIVO"
        ? `<span class="status-badge status-active">Activo</span>`
        : `<span class="status-badge status-inactive">${escapeHtml(p.estado || "—")}</span>`;
      const fuente = p.creado_manual
        ? `<span class="prest-fuente-manual">Manual</span>`
        : `<span class="prest-fuente-excel">Base datos</span>`;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(p.nit)}</strong>${p.digito_verificacion ? `<span class="text-muted">-${p.digito_verificacion}</span>` : ""}</td>
        <td>${escapeHtml(p.nombre_sucursal || "—")}</td>
        <td>${escapeHtml(p.ciudad || "—")}</td>
        <td>${escapeHtml(p.regional || "—")}</td>
        <td>${estadoBadge}</td>
        <td>${escapeHtml(p.tipo_prestador || "—")}</td>
        <td>${fuente}</td>
        <td style="white-space:nowrap">
          <div style="display:flex;align-items:center;justify-content:flex-end;gap:5px">
            <button class="btn-keralty-action btn-prest-edit">Editar</button>
            <button class="btn-keralty-action danger btn-prest-del">Eliminar</button>
          </div>
        </td>`;
      tr.querySelector(".btn-prest-edit").addEventListener("click", () => openPrestadorModal(p));
      tr.querySelector(".btn-prest-del").addEventListener("click", async () => {
        if (!confirm(`¿Eliminar el prestador NIT ${p.nit} — ${p.nombre_sucursal || ""}?\nEsta acción no se puede deshacer.`)) return;
        const res = await fetch(`/api/admin/prestadores/${p.id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          showToast("Prestador eliminado exitosamente.", "success");
          loadPrestadores($("prestadores-search").value.trim());
        } else {
          showToast(data.detail || "No se pudo eliminar el prestador.", "error");
        }
      });
      tbody.appendChild(tr);
    }
  }

  $("prestadores-search").addEventListener("input", () => {
    clearTimeout(prestadoresSearchTimer);
    prestadoresSearchTimer = setTimeout(() => {
      loadPrestadores($("prestadores-search").value.trim());
    }, 350);
  });

  $("btn-exportar-prestadores").addEventListener("click", () => {
    const q = $("prestadores-search").value.trim();
    if (q) {
      // Hay filtro activo: exportar solo los registros visibles (≤200)
      const ids = currentRenderedPrestadores.map(p => p.id).join(",");
      window.location.href = `${BASE}/api/admin/prestadores/exportar?ids=${ids}`;
    } else {
      // Sin filtro: exportar todos los prestadores
      window.location.href = `${BASE}/api/admin/prestadores/exportar`;
    }
  });

  function openPrestadorModal(p = null) {
    editingPrestadorId = p ? p.id : null;
    $("prest-modal-title").textContent = p ? "Editar Prestador" : "Nuevo Prestador";

    // Identificación
    $("pf-nit").value               = p?.nit || "";
    $("pf-nit").disabled            = !!p;
    $("pf-dv").value                = p?.digito_verificacion || "";
    $("pf-tipo-id").value           = p?.tipo_id || "";
    $("pf-tipo-persona").value      = p?.tipo_persona || "";
    $("pf-nombre").value            = p?.nombre_sucursal || "";
    $("pf-codigo").value            = p?.codigo_sucursal || "";
    $("pf-cod-habilitacion").value  = p?.cod_habilitacion || "";
    $("pf-habilitacion-sede").value = p?.habilitacion_sede || "";
    $("pf-relacion-eps").value      = p?.relacion_eps || "";

    // Empresa / Plan
    $("pf-cod-compania").value          = p?.codigo_compania || "";
    $("pf-compania").value              = p?.compania || "";
    $("pf-cod-plan").value              = p?.cod_plan || "";
    $("pf-desc-plan").value             = p?.descripcion_plan || "";
    $("pf-forma-contratacion").value    = p?.forma_contratacion || "";
    $("pf-tipo-convenio").value         = p?.tipo_convenio || "";
    $("pf-numero-contrato").value       = p?.numero_contrato || "";
    $("pf-fecha-inicio-convenio").value = p?.fecha_inicio_convenio || "";
    $("pf-fecha-fin-convenio").value    = p?.fecha_fin_convenio || "";

    // Clasificación
    $("pf-tipo").value              = p?.tipo_prestador || "";
    $("pf-naturaleza-ips").value    = p?.naturaleza_ips || "";
    $("pf-tipo-atencion").value     = p?.tipo_atencion || "";
    $("pf-especialidad").value      = p?.especialidad || "";
    $("pf-desc-especialidad").value = p?.descripcion_especialidad || "";
    $("pf-estado").value            = p?.estado || "ACTIVO";
    $("pf-premium").value           = p?.premium || "";
    $("pf-glosa-sostenida").value   = p?.glosa_sostenida || "";
    $("pf-prioridad-servicio").value= p?.prioridad_servicio || "";

    // Ubicación
    $("pf-ciudad").value      = p?.ciudad || "";
    $("pf-departamento").value= p?.departamento || "";
    $("pf-regional").value    = p?.regional || "";
    $("pf-direccion").value   = p?.direccion || "";

    // Contacto
    $("pf-telefono").value    = p?.telefono || "";
    $("pf-extension-1").value = p?.extension_1 || "";
    $("pf-telefono-2").value  = p?.telefono_2 || "";
    $("pf-extension-2").value = p?.extension_2 || "";
    $("pf-correo").value      = p?.correo || "";

    // Habilitación / Portabilidad
    $("pf-fecha-inicio-hab").value       = p?.fecha_inicio_habilitacion || "";
    $("pf-fecha-vencimiento-hab").value  = p?.fecha_vencimiento_habilitacion || "";
    $("pf-fecha-inicio-port").value      = p?.fecha_inicio_portabilidad || "";
    $("pf-fecha-fin-port").value         = p?.fecha_fin_portabilidad || "";

    $("prest-modal-overlay").classList.remove("hidden");
  }

  function closePrestadorModal() {
    $("prest-modal-overlay").classList.add("hidden");
    editingPrestadorId = null;
  }

  $("prest-modal-close").addEventListener("click", closePrestadorModal);
  $("btn-cancel-prest-admin").addEventListener("click", closePrestadorModal);
  $("prest-modal-overlay").addEventListener("click", (e) => {
    if (e.target === $("prest-modal-overlay")) closePrestadorModal();
  });

  $("btn-new-prestador-admin").addEventListener("click", () => openPrestadorModal(null));

  // ── Informe de carga / sincronización ──────────────────────────────────────
  // ── Modal genérico de informes (prestadores y usuarios) ─────────────────────
  let _reportDownloadUrl = null;

  function showReportModal(title, data, downloadBase, col1Label) {
    $("report-modal-title").textContent = title;
    $("report-modal-col1").textContent  = col1Label || "Identificador";

    // Resumen
    const parts = [];
    if (data.inserted !== undefined)
      parts.push(`<span style="color:var(--success,#38a169)">✅ <strong>${data.inserted}</strong> registro(s) cargado(s).</span>`);
    if (data.updated !== undefined)
      parts.push(`<span style="color:var(--primary,#3182ce)">🔄 <strong>${data.updated}</strong> registro(s) actualizado(s).</span>`);
    const totalRej = (data.duplicates?.length || 0) + (data.errors?.length || 0);
    if (totalRej > 0)
      parts.push(`<span style="color:var(--warning,#d69e2e)">⚠️ <strong>${totalRej}</strong> registro(s) no procesado(s) (ver tabla abajo).</span>`);
    if (parts.length === 0)
      parts.push(`<span>Operación completada sin cambios.</span>`);
    $("report-modal-summary").innerHTML = parts.map(p => `<p style="margin:.25rem 0">${p}</p>`).join("");

    // Tabla de rechazados
    const allRej = [...(data.duplicates || []), ...(data.errors || [])];
    const listWrap = $("report-modal-list-wrap");
    if (allRej.length > 0) {
      $("report-modal-tbody").innerHTML = allRej.map(r => `
        <tr style="border-bottom:1px solid var(--border,#e2e8f0)">
          <td style="padding:.4rem .75rem">${r.nit || r.usuario || "—"}</td>
          <td style="padding:.4rem .75rem">${r.nombre || "—"}</td>
          <td style="padding:.4rem .75rem;color:var(--error,#e53e3e)">${r.motivo || "—"}</td>
        </tr>`).join("");
      listWrap.classList.remove("hidden");
    } else {
      listWrap.classList.add("hidden");
    }

    // Botón de descarga
    _reportDownloadUrl = data.report_token ? `${BASE}${downloadBase}/${data.report_token}` : null;
    $("btn-descargar-reporte-modal").classList.toggle("hidden", !_reportDownloadUrl);
    $("report-modal").classList.remove("hidden");
  }

  $("report-modal-close").addEventListener("click",      () => $("report-modal").classList.add("hidden"));
  $("btn-cerrar-reporte-modal").addEventListener("click", () => $("report-modal").classList.add("hidden"));
  $("report-modal").addEventListener("click", e => {
    if (e.target === $("report-modal")) $("report-modal").classList.add("hidden");
  });
  $("btn-descargar-reporte-modal").addEventListener("click", () => {
    if (_reportDownloadUrl) {
      window.location.href = _reportDownloadUrl;
      _reportDownloadUrl = null;
      $("btn-descargar-reporte-modal").classList.add("hidden");
    }
  });

  // ── Helper genérico de upload ────────────────────────────────────────────────
  async function _uploadFile(endpoint, file, btnId, loadingText, onSuccess, onReload) {
    const btn = $(btnId);
    const origHTML = btn.innerHTML;
    const overlay = $("processing-overlay");
    const overlayMsg = $("processing-overlay-msg");
    btn.disabled = true;
    btn.textContent = loadingText;
    if (overlayMsg) overlayMsg.textContent = loadingText;
    if (overlay) overlay.classList.remove("hidden");
    const fd = new FormData();
    fd.append("archivo", file);
    try {
      const res  = await fetch(endpoint, { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        onSuccess(data);
        if (onReload) await onReload();
      } else {
        showToast(data.detail || data.error || "Error al procesar el archivo", "error");
      }
    } catch {
      showToast("Error de conexión.", "error");
    } finally {
      if (overlay) overlay.classList.add("hidden");
      btn.disabled = false;
      btn.innerHTML = origHTML;
    }
  }

  // ── Prestadores: Descargar formato ───────────────────────────────────────────
  $("btn-formato-prestadores").addEventListener("click", () => {
    window.location.href = `${BASE}/api/admin/prestadores/formato`;
  });

  // ── Prestadores: Cargar datos de Excel (INSERT only) ─────────────────────────
  $("btn-cargar-prestadores").addEventListener("click", () => $("input-cargar-prest").click());
  $("input-cargar-prest").addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    await _uploadFile(
      "/api/admin/prestadores/cargar", file,
      "btn-cargar-prestadores", "Cargando...",
      data => showReportModal("Informe de carga — Prestadores", data,
                              "/api/admin/prestadores/reporte", "NIT"),
      () => loadPrestadores($("prestadores-search").value.trim())
    );
  });

  // ── Prestadores: Sincronizar Excel (UPSERT) ───────────────────────────────────
  $("btn-sync-prestadores").addEventListener("click", () => $("input-sync-prest").click());
  $("input-sync-prest").addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    await _uploadFile(
      "/api/admin/prestadores/sincronizar", file,
      "btn-sync-prestadores", "Sincronizando...",
      data => showReportModal("Informe de sincronización — Prestadores", data,
                              "/api/admin/prestadores/reporte", "NIT"),
      () => loadPrestadores($("prestadores-search").value.trim())
    );
  });

  // ── Usuarios: Descargar formato ───────────────────────────────────────────────
  $("btn-formato-usuarios").addEventListener("click", () => {
    window.location.href = `${BASE}/api/admin/usuarios/formato`;
  });

  // ── Usuarios: Cargar datos de Excel (INSERT only) ─────────────────────────────
  $("btn-cargar-usuarios").addEventListener("click", () => $("input-cargar-users").click());
  $("input-cargar-users").addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    await _uploadFile(
      "/api/admin/usuarios/cargar", file,
      "btn-cargar-usuarios", "Cargando...",
      data => showReportModal("Informe de carga — Usuarios", data,
                              "/api/admin/usuarios/reporte", "Usuario"),
      () => loadUsers()
    );
  });

  // ── Usuarios: Sincronizar Excel (UPSERT) ──────────────────────────────────────
  $("btn-sync-usuarios").addEventListener("click", () => $("input-sync-users").click());
  $("input-sync-users").addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    await _uploadFile(
      "/api/admin/usuarios/sincronizar", file,
      "btn-sync-usuarios", "Sincronizando...",
      data => showReportModal("Informe de sincronización — Usuarios", data,
                              "/api/admin/usuarios/reporte", "Usuario"),
      () => loadUsers()
    );
  });

  $("btn-save-prest-admin").addEventListener("click", async () => {
    const nit    = $("pf-nit").value.trim();
    const nombre = $("pf-nombre").value.trim();
    if (!nit || !nombre) { showToast("NIT y nombre son requeridos", "error"); return; }

    const payload = {
      nit,
      // Identificación
      digito_verificacion:  $("pf-dv").value.trim() || null,
      tipo_id:              $("pf-tipo-id").value.trim() || null,
      tipo_persona:         $("pf-tipo-persona").value.trim() || null,
      nombre_sucursal:      nombre,
      codigo_sucursal:      $("pf-codigo").value.trim() || null,
      cod_habilitacion:     $("pf-cod-habilitacion").value.trim() || null,
      habilitacion_sede:    $("pf-habilitacion-sede").value.trim() || null,
      relacion_eps:         $("pf-relacion-eps").value.trim() || null,
      // Empresa / Plan
      codigo_compania:          $("pf-cod-compania").value.trim() || null,
      compania:                 $("pf-compania").value.trim() || null,
      cod_plan:                 $("pf-cod-plan").value.trim() || null,
      descripcion_plan:         $("pf-desc-plan").value.trim() || null,
      forma_contratacion:       $("pf-forma-contratacion").value.trim() || null,
      tipo_convenio:            $("pf-tipo-convenio").value.trim() || null,
      numero_contrato:          $("pf-numero-contrato").value.trim() || null,
      fecha_inicio_convenio:    $("pf-fecha-inicio-convenio").value.trim() || null,
      fecha_fin_convenio:       $("pf-fecha-fin-convenio").value.trim() || null,
      // Clasificación
      tipo_prestador:           $("pf-tipo").value.trim() || null,
      naturaleza_ips:           $("pf-naturaleza-ips").value.trim() || null,
      tipo_atencion:            $("pf-tipo-atencion").value.trim() || null,
      especialidad:             $("pf-especialidad").value.trim() || null,
      descripcion_especialidad: $("pf-desc-especialidad").value.trim() || null,
      estado:                   $("pf-estado").value || "ACTIVO",
      premium:                  $("pf-premium").value.trim() || null,
      glosa_sostenida:          $("pf-glosa-sostenida").value.trim() || null,
      prioridad_servicio:       $("pf-prioridad-servicio").value.trim() || null,
      // Ubicación
      ciudad:      $("pf-ciudad").value.trim() || null,
      departamento:$("pf-departamento").value.trim() || null,
      regional:    $("pf-regional").value || null,
      direccion:   $("pf-direccion").value.trim() || null,
      // Contacto
      telefono:    $("pf-telefono").value.trim() || null,
      extension_1: $("pf-extension-1").value.trim() || null,
      telefono_2:  $("pf-telefono-2").value.trim() || null,
      extension_2: $("pf-extension-2").value.trim() || null,
      correo:      $("pf-correo").value.trim() || null,
      // Habilitación / Portabilidad
      fecha_inicio_habilitacion:       $("pf-fecha-inicio-hab").value.trim() || null,
      fecha_vencimiento_habilitacion:  $("pf-fecha-vencimiento-hab").value.trim() || null,
      fecha_inicio_portabilidad:       $("pf-fecha-inicio-port").value.trim() || null,
      fecha_fin_portabilidad:          $("pf-fecha-fin-port").value.trim() || null,
    };

    const url    = editingPrestadorId ? `/api/admin/prestadores/${editingPrestadorId}` : "/api/admin/prestadores";
    const method = editingPrestadorId ? "PUT" : "POST";
    const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || "Error al guardar", "error"); return; }
    showToast(data.mensaje || "Prestador guardado");
    closePrestadorModal();
    await loadPrestadores($("prestadores-search").value.trim());
  });

  // ---------------------------------------------------------------
  // NAVIGATION
  // ---------------------------------------------------------------
  btnBack.addEventListener("click", () => {
    showSection(mainSection);
    currentEditId = null;
    sessionStorage.removeItem("rur_last_edit_id");
    sessionStorage.removeItem("rur_last_edit_ts");
    sessionStorage.setItem("rur_last_view", "main");
    loadMainRecords();
  });

  // Refrescar timestamp de actividad mientras se trabaja en el formulario
  // (máx. 1 escritura por minuto para no saturar)
  let _activityRefreshTimer = null;
  formSection.addEventListener("mousemove", _touchEditActivity, { passive: true });
  formSection.addEventListener("keydown",   _touchEditActivity, { passive: true });
  formSection.addEventListener("click",     _touchEditActivity, { passive: true });
  function _touchEditActivity() {
    if (!sessionStorage.getItem("rur_last_edit_id")) return;
    if (_activityRefreshTimer) return;
    _activityRefreshTimer = setTimeout(() => {
      _activityRefreshTimer = null;
      if (sessionStorage.getItem("rur_last_edit_id")) {
        sessionStorage.setItem("rur_last_edit_ts", String(Date.now()));
      }
    }, 60_000); // actualizar timestamp máximo 1 vez por minuto
  }

  // ---------------------------------------------------------------
  // FIELD SEARCH: Filtrar campos del formulario
  // ---------------------------------------------------------------
  function filterFields(q) {
    const groups = dynamicForm.querySelectorAll(".field-group");
    let visible = 0;

    groups.forEach((group) => {
      const label = group.querySelector("label");
      const text = label ? label.textContent.toLowerCase() : "";
      const matches = !q || text.includes(q);
      group.style.display = matches ? "" : "none";
      if (matches) visible++;
    });

    // Mostrar/ocultar secciones según si tienen campos visibles
    dynamicForm.querySelectorAll(".role-section-body, .current-role-section").forEach((sec) => {
      const hasVisible = sec.querySelector(".field-group:not([style*='display: none'])");
      if (sec.classList.contains("role-section-body")) {
        const details = sec.closest("details");
        if (details) {
          details.style.display = hasVisible || !q ? "" : "none";
          if (q && hasVisible) details.open = true;
        }
      } else {
        sec.style.display = hasVisible || !q ? "" : "none";
      }
    });

    if (q) {
      fieldSearchCount.textContent = `${visible} campo${visible !== 1 ? "s" : ""} encontrado${visible !== 1 ? "s" : ""}`;
      fieldSearchCount.style.display = "";
    } else {
      fieldSearchCount.style.display = "none";
      // Restaurar secciones colapsadas
      dynamicForm.querySelectorAll("details.role-section").forEach((d) => { d.open = false; });
    }
  }

  fieldSearch.addEventListener("input", () => {
    const q = fieldSearch.value.toLowerCase().trim();
    fieldSearchClear.classList.toggle("hidden", !q);
    filterFields(q);
  });

  fieldSearchClear.addEventListener("click", () => {
    fieldSearch.value = "";
    fieldSearchClear.classList.add("hidden");
    filterFields("");
    fieldSearch.focus();
  });

  // Resetear buscador al abrir el formulario
  function resetFieldSearch() {
    fieldSearch.value = "";
    fieldSearchClear.classList.add("hidden");
    fieldSearchCount.style.display = "none";
  }

  // ---------------------------------------------------------------
  // NOTIFICATION SYSTEM
  // ---------------------------------------------------------------
  const btnNotif      = document.getElementById("btn-notif");
  const notifBadge    = document.getElementById("notif-badge");
  const notifPanel    = document.getElementById("notif-panel");
  const notifOverlay  = document.getElementById("notif-overlay");
  const notifList     = document.getElementById("notif-list");
  const btnMarkAll    = document.getElementById("btn-notif-mark-all");
  const btnNotifClose = document.getElementById("btn-notif-close");

  let notifPollInterval = null;

  function timeAgo(isoStr) {
    if (!isoStr) return "";
    const diff = Math.floor((Date.now() - new Date(isoStr)) / 1000);
    if (diff < 60)   return "Ahora mismo";
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    return `Hace ${Math.floor(diff / 86400)} d`;
  }

  function renderNotifications(items) {
    if (!items || items.length === 0) {
      notifList.innerHTML = '<p class="notif-empty">No tienes notificaciones</p>';
      return;
    }
    notifList.innerHTML = items.map(n => `
      <div class="notif-item ${n.leida ? 'read' : 'unread'}" data-id="${n.id}" data-registro="${n.registro_id || ''}">
        <span class="notif-dot"></span>
        <div class="notif-body">
          <p class="notif-msg">${n.mensaje}</p>
          <p class="notif-time">${timeAgo(n.fecha_creacion)}</p>
        </div>
        <button class="notif-del" title="Eliminar" data-id="${n.id}">×</button>
      </div>
    `).join("");

    notifList.querySelectorAll(".notif-item").forEach(el => {
      el.addEventListener("click", async (e) => {
        if (e.target.classList.contains("notif-del")) return;
        const id = el.dataset.id;
        const registroId = el.dataset.registro;
        // Marcar como leída y eliminar del panel
        await fetch(`/api/notificaciones/${id}/leer`, { method: "PUT" });
        el.remove();
        if (!notifList.querySelector(".notif-item")) {
          notifList.innerHTML = '<p class="notif-empty">No tienes notificaciones</p>';
        }
        updateBadgeFromPanel();

        if (registroId) {
          closeNotifPanel();
          try {
            const res = await fetch(`/api/registro/${registroId}`);
            if (res.ok) {
              const data = await res.json();
              openEditForm(registroId, data);
            }
          } catch (_) {}
        } else {
          closeNotifPanel();
        }
      });
    });

    notifList.querySelectorAll(".notif-del").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        await fetch(`/api/notificaciones/${id}`, { method: "DELETE" });
        btn.closest(".notif-item").remove();
        if (!notifList.querySelector(".notif-item")) {
          notifList.innerHTML = '<p class="notif-empty">No tienes notificaciones</p>';
        }
        updateBadgeFromPanel();
      });
    });
  }

  function updateBadgeFromPanel() {
    const unread = notifList.querySelectorAll(".notif-item.unread").length;
    notifBadge.textContent = unread > 9 ? "9+" : unread;
    notifBadge.classList.toggle("hidden", unread === 0);
  }

  async function loadNotifications() {
    try {
      const res = await fetch("/api/notificaciones");
      if (!res.ok) return;
      const items = await res.json();
      renderNotifications(items);
      const unread = items.filter(n => !n.leida).length;
      notifBadge.textContent = unread > 9 ? "9+" : unread;
      notifBadge.classList.toggle("hidden", unread === 0);
    } catch (_) {}
  }

  async function pollUnreadCount() {
    try {
      const res = await fetch("/api/notificaciones/no-leidas");
      if (!res.ok) return;
      const data = await res.json();
      const count = data.count || 0;
      notifBadge.textContent = count > 9 ? "9+" : count;
      notifBadge.classList.toggle("hidden", count === 0);
    } catch (_) {}
  }

  function openNotifPanel() {
    notifOverlay.classList.remove("hidden");
    notifPanel.classList.remove("hidden");
    loadNotifications();
  }

  function closeNotifPanel() {
    notifOverlay.classList.add("hidden");
    notifPanel.classList.add("hidden");
  }

  if (btnNotif) {
    btnNotif.addEventListener("click", () => {
      if (notifPanel.classList.contains("hidden")) {
        openNotifPanel();
      } else {
        closeNotifPanel();
      }
    });
  }

  if (notifOverlay) notifOverlay.addEventListener("click", closeNotifPanel);
  if (btnNotifClose) btnNotifClose.addEventListener("click", closeNotifPanel);

  if (btnMarkAll) {
    btnMarkAll.addEventListener("click", async () => {
      await fetch("/api/notificaciones/leer-todas", { method: "PUT" });
      notifList.querySelectorAll(".notif-item.unread").forEach(el => {
        el.classList.remove("unread");
        el.classList.add("read");
        el.querySelector(".notif-dot").style.background = "transparent";
      });
      notifBadge.classList.add("hidden");
    });
  }

  function startNotifPolling() {
    pollUnreadCount();
    notifPollInterval = setInterval(pollUnreadCount, 30000);
  }

  // ---------------------------------------------------------------
  // HISTORIAL DE NOTIFICACIONES
  // ---------------------------------------------------------------
  let historialFiltroActivo = "todas";

  const TIPO_LABELS = {
    asignacion_responsable:  { label: "Asignación",     cls: "tipo-asignacion" },
    nuevo_registro_equipo:   { label: "Nuevo registro", cls: "tipo-nuevo"      },
    nuevo_registro_ciudad:   { label: "Nueva ciudad",   cls: "tipo-ciudad"     },
  };

  function historialTimeStr(isoStr) {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    return d.toLocaleString("es-CO", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  async function loadHistorial(filtro) {
    historialFiltroActivo = filtro || "todas";

    // Actualizar botones de filtro activo
    document.querySelectorAll(".historial-filter-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.filter === historialFiltroActivo);
    });

    const list = $("historial-list");
    const counter = $("historial-count");
    list.innerHTML = '<p class="notif-empty">Cargando...</p>';

    try {
      const res = await fetch(`/api/notificaciones/historial?filtro=${historialFiltroActivo}`);
      if (!res.ok) { list.innerHTML = '<p class="notif-empty">Error al cargar el historial.</p>'; return; }
      const items = await res.json();

      counter.textContent = `${items.length} notificación${items.length !== 1 ? "es" : ""}`;

      if (!items.length) {
        list.innerHTML = '<p class="notif-empty">No hay notificaciones en esta categoría.</p>';
        return;
      }

      list.innerHTML = "";
      for (const n of items) {
        const isRead = Boolean(n.leida);
        const tipoMeta = TIPO_LABELS[n.tipo] || { label: "Aviso", cls: "tipo-otro" };
        const hasRecord = Boolean(n.registro_id);

        const card = document.createElement("div");
        card.className = `historial-card ${isRead ? "read" : "unread"} ${hasRecord ? "clickable" : ""}`;
        card.dataset.id = n.id;
        card.dataset.registro = n.registro_id || "";

        card.innerHTML = `
          <div class="historial-card-dot"></div>
          <div class="historial-card-body">
            <p class="historial-card-msg">${escapeHtml(n.mensaje)}</p>
            <div class="historial-card-meta">
              <span class="historial-card-time">${historialTimeStr(n.fecha_creacion)}</span>
              <span class="historial-card-badge ${tipoMeta.cls}">${tipoMeta.label}</span>
              ${hasRecord ? `<button class="historial-card-link" data-registro="${n.registro_id}">Ver registro #${n.registro_id}</button>` : ""}
            </div>
          </div>
          </div>`;

        // Marcar leída y navegar al registro al hacer clic en la tarjeta
        card.addEventListener("click", async (e) => {

          // Marcar leída si no lo estaba
          if (!isRead) {
            await fetch(`/api/notificaciones/${n.id}/leer`, { method: "PUT" });
            card.classList.remove("unread");
            card.classList.add("read");
            card.querySelector(".historial-card-dot").style.background = "var(--border)";
            pollUnreadCount();
          }

          // Si tiene registro asociado, navegar a él
          if (hasRecord) {
            try {
              await openEditForm(n.registro_id, { consecutivo: "", nombre: "" });
            } catch (_) {
              showToast("Error al cargar el registro.", "error");
            }
          }
        });


        list.appendChild(card);
      }
    } catch (_) {
      list.innerHTML = '<p class="notif-empty">Error de conexión.</p>';
    }
  }

  // Botones de filtro
  document.querySelectorAll(".historial-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => loadHistorial(btn.dataset.filter));
  });

  // Botón "Marcar todas leídas" en historial
  const btnHistorialMarkAll = $("btn-historial-mark-all");
  if (btnHistorialMarkAll) {
    btnHistorialMarkAll.addEventListener("click", async () => {
      await fetch("/api/notificaciones/leer-todas", { method: "PUT" });
      document.querySelectorAll(".historial-card.unread").forEach(card => {
        card.classList.remove("unread");
        card.classList.add("read");
        const dot = card.querySelector(".historial-card-dot");
        if (dot) dot.style.background = "var(--border)";
      });
      pollUnreadCount();
    });
  }

  // Botón volver desde historial
  const btnHistorialBack = $("btn-historial-back");
  if (btnHistorialBack) {
    btnHistorialBack.addEventListener("click", () => showSection(mainSection));
  }

  // ---------------------------------------------------------------
  // SOLICITUDES DE PRESTADOR
  // ---------------------------------------------------------------

  // -- Modal: abrir/cerrar --
  function openSolicitudModal(nit) {
    $("solicitud-nit-display").textContent = nit;
    $("solicitud-nit").value = nit;
    $("solicitud-comentario").value = "";
    $("solicitud-modal").classList.remove("hidden");
    $("solicitud-comentario").focus();
  }

  $("solicitud-modal-close").addEventListener("click", () => $("solicitud-modal").classList.add("hidden"));
  $("solicitud-cancel").addEventListener("click",      () => $("solicitud-modal").classList.add("hidden"));
  $("solicitud-modal").addEventListener("click", (e) => {
    if (e.target === $("solicitud-modal")) $("solicitud-modal").classList.add("hidden");
  });

  $("solicitud-submit").addEventListener("click", async () => {
    const nit  = $("solicitud-nit").value.trim();
    const comt = $("solicitud-comentario").value.trim();
    if (!nit) return;
    const btn = $("solicitud-submit");
    btn.disabled = true;
    btn.textContent = "Enviando...";
    try {
      const res  = await fetch("/api/solicitudes-prestador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nit, comentario: comt }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Error al enviar la solicitud", "error"); return; }
      $("solicitud-modal").classList.add("hidden");
      showToast("Solicitud enviada al administrador.", "success");
      updateSolicitudesBadge();
    } finally {
      btn.disabled = false;
      btn.textContent = "Enviar solicitud";
    }
  });

  // -- Badge en sidebar (Solicitudes) --
  async function updateSolicitudesBadge() {
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/solicitudes-prestador/pendientes-count"),
        fetch("/api/solicitudes-usuario/pendientes-count"),
      ]);
      const d1 = await r1.json();
      const d2 = await r2.json();
      const total = (d1.count || 0) + (d2.count || 0);
      const badge = $("solicitudes-sidebar-badge");
      if (total > 0) {
        badge.textContent = total;
        badge.classList.remove("hidden");
      } else {
        badge.classList.add("hidden");
      }
    } catch (_) {}
  }

  // -- Badge en sidebar (Solicitar Gestor) — solo para LIDER/CONTRALOR --
  async function updateSolGestorBadge() {
    try {
      const res  = await fetch("/api/solicitudes-usuario/pendientes-count");
      const data = await res.json();
      const badge = $("sol-gestor-sidebar-badge");
      if (!badge) return;
      if (data.count > 0) {
        badge.textContent = data.count;
        badge.classList.remove("hidden");
      } else {
        badge.classList.add("hidden");
      }
    } catch (_) {}
  }

  // -- Tipo activo y filtro activo de solicitudes --
  let solicitudesTipoActivo   = "prestadores";
  let solicitudesFiltroActivo = "todas";

  function _setSolicitudesTipo(tipo) {
    solicitudesTipoActivo = tipo;
    document.querySelectorAll("[data-sol-tipo]").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.solTipo === tipo);
    });
    // Resetear filtro al cambiar de tipo
    solicitudesFiltroActivo = "todas";
    document.querySelectorAll("[data-sol-filter]").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.solFilter === "todas");
    });
    loadSolicitudes("todas");
  }

  async function loadSolicitudes(filtro) {
    solicitudesFiltroActivo = filtro;
    document.querySelectorAll("[data-sol-filter]").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.solFilter === filtro);
    });
    if (solicitudesTipoActivo === "gestores") {
      await _loadSolicitudesGestor(filtro);
    } else {
      await _loadSolicitudesPrestador(filtro);
    }
  }

  async function _loadSolicitudesPrestador(filtro) {
    const list  = $("solicitudes-list");
    const count = $("solicitudes-count");
    list.innerHTML = '<p class="notif-empty">Cargando...</p>';

    const res = await fetch("/api/solicitudes-prestador");
    if (!res.ok) { list.innerHTML = '<p class="notif-empty">Error al cargar solicitudes.</p>'; return; }
    let items = await res.json();

    if (filtro !== "todas") items = items.filter(s => s.estado === filtro);
    count.textContent = `${items.length} solicitud${items.length !== 1 ? "es" : ""}`;

    if (!items.length) {
      list.innerHTML = '<p class="notif-empty">No hay solicitudes en esta categoría.</p>';
      return;
    }

    list.innerHTML = "";
    for (const sol of items) {
      const card = document.createElement("div");
      card.className = `solicitud-card solicitud-${sol.estado}`;

      const estadoBadge = {
        pendiente: '<span class="sol-badge sol-pendiente">Pendiente</span>',
        realizado: '<span class="sol-badge sol-realizado">Realizado</span>',
        denegado:  '<span class="sol-badge sol-denegado">Denegado</span>',
      }[sol.estado] || "";

      const respuestaHtml = sol.estado !== "pendiente" && sol.comentario_respuesta
        ? `<p class="sol-resp-comentario"><strong>Respuesta:</strong> ${escapeHtml(sol.comentario_respuesta)}</p>` : "";

      const adminActions = sessionIsAdmin && sol.estado === "pendiente" ? `
        <div class="sol-admin-actions">
          <button class="btn-sol-realizado" data-id="${sol.id}">✔ Marcar como realizado</button>
          <button class="btn-sol-denegar"   data-id="${sol.id}" data-nit="${escapeHtml(sol.nit)}">✘ Denegar</button>
        </div>` : "";

      card.innerHTML = `
        <div class="sol-card-header">
          <div class="sol-card-title">
            <span class="sol-nit">NIT: <strong>${escapeHtml(sol.nit)}</strong></span>
            ${estadoBadge}
          </div>
          <span class="sol-fecha">${sol.fecha_solicitud ? new Date(sol.fecha_solicitud).toLocaleString("es-CO") : ""}</span>
        </div>
        <p class="sol-solicitante">Solicitado por: <strong>${escapeHtml(sol.nombre_solicitante || sol.solicitante)}</strong></p>
        ${sol.comentario ? `<p class="sol-comentario">${escapeHtml(sol.comentario)}</p>` : ""}
        ${respuestaHtml}
        ${adminActions}`;

      card.querySelector(".btn-sol-realizado")?.addEventListener("click", async () => {
        await _responderSolicitudPrestador(sol.id, "realizado", "");
      });
      card.querySelector(".btn-sol-denegar")?.addEventListener("click", () => {
        openDenegarModal(sol.id, sol.nit);
      });

      list.appendChild(card);
    }
  }

  async function _loadSolicitudesGestor(filtro) {
    const list  = $("solicitudes-list");
    const count = $("solicitudes-count");
    list.innerHTML = '<p class="notif-empty">Cargando...</p>';

    const res = await fetch("/api/solicitudes-usuario");
    if (!res.ok) { list.innerHTML = '<p class="notif-empty">Error al cargar solicitudes.</p>'; return; }
    let items = await res.json();

    if (filtro !== "todas") items = items.filter(s => s.estado === filtro);
    count.textContent = `${items.length} solicitud${items.length !== 1 ? "es" : ""}`;

    if (!items.length) {
      list.innerHTML = '<p class="notif-empty">No hay solicitudes en esta categoría.</p>';
      return;
    }

    list.innerHTML = "";
    for (const sol of items) {
      const card = document.createElement("div");
      card.className = `solicitud-card solicitud-${sol.estado}`;

      const estadoBadge = {
        pendiente: '<span class="sol-badge sol-pendiente">Pendiente</span>',
        realizado: '<span class="sol-badge sol-realizado">Aprobada</span>',
        denegado:  '<span class="sol-badge sol-denegado">Denegada</span>',
      }[sol.estado] || "";

      const respuestaHtml = sol.estado !== "pendiente" && sol.comentario_respuesta
        ? `<p class="sol-resp-comentario"><strong>Respuesta:</strong> ${escapeHtml(sol.comentario_respuesta)}</p>` : "";

      // Si fue aprobada, mostrar los datos del gestor solicitado
      const datosAprobacion = sol.estado === "realizado" ? `
        <div class="sol-datos-gestor">
          <p><strong>Datos del gestor aprobado:</strong></p>
          <p>Nombre: ${escapeHtml(sol.nombre_completo)}</p>
          <p>Correo: ${escapeHtml(sol.correo)}</p>
          <p>Regional: ${escapeHtml(sol.regional)} | Rol: ${escapeHtml(sol.rol_solicitado)}</p>
        </div>` : "";

      const adminActions = sessionIsAdmin && sol.estado === "pendiente" ? `
        <div class="sol-admin-actions">
          <button class="btn-sol-gestor-aprobar" data-id="${sol.id}">✔ Aprobar</button>
          <button class="btn-sol-gestor-denegar" data-id="${sol.id}" data-nombre="${escapeHtml(sol.nombre_completo)}">✘ Denegar</button>
        </div>` : "";

      card.innerHTML = `
        <div class="sol-card-header">
          <div class="sol-card-title">
            <span class="sol-nit"><strong>${escapeHtml(sol.nombre_completo)}</strong> — ${escapeHtml(sol.rol_solicitado)}</span>
            ${estadoBadge}
          </div>
          <span class="sol-fecha">${sol.fecha_solicitud ? new Date(sol.fecha_solicitud).toLocaleString("es-CO") : ""}</span>
        </div>
        <p class="sol-solicitante">Solicitado por: <strong>${escapeHtml(sol.nombre_solicitante || sol.solicitante)}</strong></p>
        <p class="sol-comentario" style="color:var(--text-muted);font-size:.85rem">
          Correo: ${escapeHtml(sol.correo)} | Regional: ${escapeHtml(sol.regional)}
        </p>
        ${sol.comentario ? `<p class="sol-comentario">${escapeHtml(sol.comentario)}</p>` : ""}
        ${datosAprobacion}
        ${respuestaHtml}
        ${adminActions}`;

      card.querySelector(".btn-sol-gestor-aprobar")?.addEventListener("click", async () => {
        await _responderSolicitudGestor(sol.id, "realizado", "");
      });
      card.querySelector(".btn-sol-gestor-denegar")?.addEventListener("click", () => {
        _openDenegarGestorModal(sol.id, sol.nombre_completo);
      });

      list.appendChild(card);
    }
  }

  async function _responderSolicitudPrestador(id, estado, comentario_respuesta) {
    const res  = await fetch(`/api/solicitudes-prestador/${id}/responder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado, comentario_respuesta }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || "Error al responder", "error"); return; }
    showToast(data.mensaje, "success");
    loadSolicitudes(solicitudesFiltroActivo);
    updateSolicitudesBadge();
  }

  // Mantener alias para compatibilidad con llamadas previas
  async function responderSolicitud(id, estado, comentario_respuesta) {
    return _responderSolicitudPrestador(id, estado, comentario_respuesta);
  }

  async function _responderSolicitudGestor(id, estado, comentario_respuesta) {
    const res  = await fetch(`/api/solicitudes-usuario/${id}/responder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado, comentario_respuesta }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || "Error al responder", "error"); return; }
    showToast(data.mensaje, "success");
    loadSolicitudes(solicitudesFiltroActivo);
    updateSolicitudesBadge();
    updateSolGestorBadge();
  }

  // -- Modal denegar prestador --
  let denegarSolicitudId = null;

  function openDenegarModal(id, nit) {
    denegarSolicitudId = id;
    $("denegar-nit-display").textContent = nit;
    $("denegar-comentario").value = "";
    $("denegar-modal").classList.remove("hidden");
    $("denegar-comentario").focus();
  }

  $("denegar-modal-close").addEventListener("click", () => $("denegar-modal").classList.add("hidden"));
  $("denegar-cancel").addEventListener("click",       () => $("denegar-modal").classList.add("hidden"));
  $("denegar-modal").addEventListener("click", (e) => {
    if (e.target === $("denegar-modal")) $("denegar-modal").classList.add("hidden");
  });

  $("denegar-confirm").addEventListener("click", async () => {
    const comt = $("denegar-comentario").value.trim();
    if (!comt) { showToast("Debes indicar el motivo de la denegación", "error"); return; }
    $("denegar-modal").classList.add("hidden");
    await _responderSolicitudPrestador(denegarSolicitudId, "denegado", comt);
    denegarSolicitudId = null;
  });

  // -- Modal denegar gestor --
  let denegarGestorSolicitudId = null;

  function _openDenegarGestorModal(id, nombre) {
    denegarGestorSolicitudId = id;
    $("dg-nombre-display").textContent = nombre;
    $("dg-comentario").value = "";
    $("denegar-gestor-modal").classList.remove("hidden");
    $("dg-comentario").focus();
  }

  $("dg-modal-close").addEventListener("click",  () => $("denegar-gestor-modal").classList.add("hidden"));
  $("dg-cancel").addEventListener("click",        () => $("denegar-gestor-modal").classList.add("hidden"));
  $("denegar-gestor-modal").addEventListener("click", (e) => {
    if (e.target === $("denegar-gestor-modal")) $("denegar-gestor-modal").classList.add("hidden");
  });

  $("dg-confirm").addEventListener("click", async () => {
    const comt = $("dg-comentario").value.trim();
    if (!comt) { showToast("Debes indicar el motivo de la denegación", "error"); return; }
    $("denegar-gestor-modal").classList.add("hidden");
    await _responderSolicitudGestor(denegarGestorSolicitudId, "denegado", comt);
    denegarGestorSolicitudId = null;
  });

  // -- Filtros de solicitudes --
  document.querySelectorAll("[data-sol-filter]").forEach(btn => {
    btn.addEventListener("click", () => loadSolicitudes(btn.dataset.solFilter));
  });

  // -- Tabs de tipo --
  document.querySelectorAll("[data-sol-tipo]").forEach(btn => {
    btn.addEventListener("click", () => _setSolicitudesTipo(btn.dataset.solTipo));
  });

  // -- Volver --
  $("btn-solicitudes-back")?.addEventListener("click", () => showSection(mainSection));

  // ---------------------------------------------------------------
  // SOLICITAR GESTOR — Modal para LIDER/CONTRALOR
  // ---------------------------------------------------------------

  function _openSolGestorModal() {
    $("sg-nombre").value     = "";
    $("sg-correo").value     = "";
    $("sg-comentario").value = "";
    $("sg-rol").value        = "GESTOR 1";
    // Pre-llenar regional: CONTRALOR siempre vacío (debe seleccionar); LIDER usa su regional
    const esContralor = sessionPermisos.includes("CONTRALOR");
    const regional = esContralor ? "" : (sessionRegional || "");
    $("sg-regional").value = regional;
    // Limpiar errores visuales previos
    ["sg-nombre", "sg-correo", "sg-regional"].forEach(id => {
      $(id).style.borderColor = "";
    });
    $("sol-gestor-modal").classList.remove("hidden");
    $("sg-nombre").focus();
  }

  $("nav-solicitar-gestor").addEventListener("click", _openSolGestorModal);
  $("sol-gestor-modal-close").addEventListener("click", () => $("sol-gestor-modal").classList.add("hidden"));
  $("sg-cancel").addEventListener("click",              () => $("sol-gestor-modal").classList.add("hidden"));
  $("sol-gestor-modal").addEventListener("click", (e) => {
    if (e.target === $("sol-gestor-modal")) $("sol-gestor-modal").classList.add("hidden");
  });

  $("sg-submit").addEventListener("click", async () => {
    const nombre   = $("sg-nombre").value.trim();
    const correo   = $("sg-correo").value.trim();
    const regional = $("sg-regional").value;
    const rol      = $("sg-rol").value;
    const comt     = $("sg-comentario").value.trim();

    // Validaciones FE
    let hayError = false;
    if (!nombre)   { $("sg-nombre").style.borderColor   = "#dc2626"; hayError = true; } else { $("sg-nombre").style.borderColor   = ""; }
    if (!correo)   { $("sg-correo").style.borderColor   = "#dc2626"; hayError = true; } else { $("sg-correo").style.borderColor   = ""; }
    if (!regional) { $("sg-regional").style.borderColor = "#dc2626"; hayError = true; } else { $("sg-regional").style.borderColor = ""; }
    if (hayError) { showToast("Completa todos los campos obligatorios", "error"); return; }

    const btn = $("sg-submit");
    btn.disabled = true;
    btn.textContent = "Enviando...";
    try {
      const res = await fetch("/api/solicitudes-usuario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre_completo: nombre, correo, regional, rol_solicitado: rol, comentario: comt }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.detail || data.error || "Error al enviar la solicitud", "error"); return; }
      $("sol-gestor-modal").classList.add("hidden");
      showToast("Solicitud enviada al administrador.", "success");
      updateSolicitudesBadge();
      updateSolGestorBadge();
    } finally {
      btn.disabled = false;
      btn.textContent = "Enviar solicitud";
    }
  });

  // -- Añadir tipos de notificación para solicitudes en el historial --
  TIPO_LABELS.solicitud_prestador          = { label: "Solicitud NIT",     cls: "tipo-solicitud" };
  TIPO_LABELS.solicitud_realizada          = { label: "NIT creado",        cls: "tipo-nuevo"     };
  TIPO_LABELS.solicitud_denegada           = { label: "NIT denegado",      cls: "tipo-otro"      };
  TIPO_LABELS.solicitud_usuario            = { label: "Solicitud Gestor",  cls: "tipo-solicitud" };
  TIPO_LABELS.solicitud_usuario_realizada  = { label: "Gestor aprobado",   cls: "tipo-nuevo"     };
  TIPO_LABELS.solicitud_usuario_denegada   = { label: "Gestor denegado",   cls: "tipo-otro"      };

  // ---------------------------------------------------------------
  // FESTIVOS — Gestión del calendario de días festivos
  // ---------------------------------------------------------------
  let allFestivos = [];
  let editingFestivoId = null;

  const DIAS_SEMANA = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

  async function loadFestivos() {
    const res = await fetch("/api/festivos");
    if (!res.ok) { showToast("Error al cargar festivos", "error"); return; }
    allFestivos = await res.json();
    renderFestivos(allFestivos);
  }

  function renderFestivos(list) {
    const q = ($("festivos-search")?.value || "").toLowerCase();
    const filtered = q ? list.filter(f => f.fecha.includes(q)) : list;
    $("festivos-count").textContent = `${filtered.length} festivo${filtered.length !== 1 ? "s" : ""}`;
    const tbody = $("festivos-tbody");
    tbody.innerHTML = "";
    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:#888">Sin festivos</td></tr>`;
      return;
    }
    filtered.forEach(f => {
      const d = new Date(f.fecha + "T12:00:00");
      const dia = DIAS_SEMANA[d.getDay()];
      const fmtFecha = f.fecha.split("-").reverse().join("/");
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${fmtFecha}</td>
        <td>${dia}</td>
        <td>
          <div style="display:flex;align-items:center;justify-content:flex-end;gap:5px">
            <button class="btn-keralty-action" title="Editar">Editar</button>
            <button class="btn-keralty-action danger" title="Eliminar">Eliminar</button>
          </div>
        </td>`;
      tr.querySelector('[title="Editar"]').addEventListener("click", () => openFestivoModal(f.id, f.fecha));
      tr.querySelector('[title="Eliminar"]').addEventListener("click", () => window._deleteFestivo(f.id, fmtFecha));
      tbody.appendChild(tr);
    });
  }

  function openFestivoModal(id = null, fecha = "") {
    editingFestivoId = id;
    $("festivo-modal-title").textContent = id ? "Editar Festivo" : "Agregar Festivo";
    $("festivo-fecha").value = fecha;
    $("festivo-modal-overlay").classList.remove("hidden");
    $("festivo-fecha").focus();
  }

  function closeFestivoModal() {
    $("festivo-modal-overlay").classList.add("hidden");
    editingFestivoId = null;
  }

  window._editFestivo   = (id, fecha) => openFestivoModal(id, fecha);
  window._deleteFestivo = async (id, fechaStr) => {
    if (!confirm(`¿Eliminar el festivo del ${fechaStr}?`)) return;
    const res = await fetch(`/api/admin/festivos/${id}`, { method: "DELETE" });
    const d   = await res.json();
    if (res.ok) { showToast("Festivo eliminado", "success"); loadFestivos(); }
    else showToast(d.error || "Error al eliminar", "error");
  };

  // --- Descargar formato de festivos ---
  $("btn-formato-festivos").addEventListener("click", () => {
    window.location.href = `${BASE}/api/admin/festivos/formato`;
  });

  // --- Cargar festivos desde Excel ---
  $("btn-cargar-festivos").addEventListener("click", () => $("input-cargar-festivos").click());

  $("input-cargar-festivos").addEventListener("change", async function () {
    const file = this.files[0];
    if (!file) return;
    this.value = "";
    const btn  = $("btn-cargar-festivos");
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = "Cargando...";
    try {
      const fd = new FormData();
      fd.append("archivo", file);
      const res  = await fetch("/api/admin/festivos/cargar", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Error al cargar festivos", "error"); return; }

      // Reutilizar el modal de reporte genérico para mostrar resultado
      const fakeData = {
        inserted: data.insertados,
        duplicates: (data.duplicados || []).map(f => ({ usuario: f, nombre: "—", motivo: "Ya existe en la base de datos" })),
        errors:     (data.errores   || []).map(f => ({ usuario: f, nombre: "—", motivo: "Formato de fecha inválido" })),
        report_token: null,
      };
      showReportModal("Resultado de carga — Festivos", fakeData, null, "Fecha");
      await loadFestivos();
      _festivosSet = null; // resetear cache de festivos para el evaluador
    } catch {
      showToast("Error de conexión al cargar festivos", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  });

  $("btn-new-festivo").addEventListener("click", () => openFestivoModal());
  $("btn-cancel-festivo").addEventListener("click", closeFestivoModal);
  $("btn-cancel-festivo2").addEventListener("click", closeFestivoModal);
  $("festivo-modal-overlay").addEventListener("click", e => {
    if (e.target === $("festivo-modal-overlay")) closeFestivoModal();
  });

  $("festivos-search").addEventListener("input", () => renderFestivos(allFestivos));

  $("btn-save-festivo").addEventListener("click", async () => {
    const fecha = $("festivo-fecha").value;
    if (!fecha) { showToast("Ingrese una fecha", "error"); return; }
    const url    = editingFestivoId ? `/api/admin/festivos/${editingFestivoId}` : "/api/admin/festivos";
    const method = editingFestivoId ? "PUT" : "POST";
    const res    = await fetch(url, {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fecha }),
    });
    const d = await res.json();
    if (res.ok) {
      showToast(editingFestivoId ? "Festivo actualizado" : "Festivo agregado", "success");
      closeFestivoModal();
      loadFestivos();
    } else {
      showToast(d.error || "Error al guardar", "error");
    }
  });

  $("btn-festivos-back").addEventListener("click", () => showSection(mainSection));

  // ---------------------------------------------------------------
  // CAMPOS — Configuración de campos del formulario
  // ---------------------------------------------------------------

  let allCampos = [];
  let editingCampoId = null;

  // Secciones fijas: una por grupo de roles
  // Un campo con múltiples roles aparece en todas las secciones correspondientes
  const CAMPOS_SECTIONS = [
    { label: "Sección 1 — GESTOR 1",         filter: c => c.rol.split(",").map(r=>r.trim()).includes("GESTOR 1") },
    { label: "Sección 2 — GESTOR 2 / LIDER", filter: c => c.rol.split(",").map(r=>r.trim()).some(r => r === "GESTOR 2" || r === "LIDER") },
    { label: "Sección 3 — CONTRALOR",         filter: c => c.rol.split(",").map(r=>r.trim()).includes("CONTRALOR") },
  ];

  async function loadCampos() {
    const res = await fetch("/api/admin/campos");
    allCampos = await res.json();
    renderCampos();
  }

  function renderCampos() {
    const q = ($("campos-search").value || "").toLowerCase();
    const filtered = q ? allCampos.filter(c =>
      c.codigo.toLowerCase().includes(q) || c.nombre.toLowerCase().includes(q)
    ) : allCampos;

    $("campos-count").textContent = `${filtered.length} campo(s)`;
    const container = $("campos-sections-container");
    container.innerHTML = "";

    CAMPOS_SECTIONS.forEach(({ label, filter }) => {
      const sectionFields = filtered.filter(filter);
      const panel = document.createElement("div");
      panel.className = "campos-section-panel";
      panel.innerHTML = `
        <div class="campos-section-header">
          <h3 style="margin:0;font-size:1rem">${label}</h3>
          <span class="records-count">${sectionFields.length} campo(s)</span>
        </div>
        <div class="table-wrap">
          <table class="keralty-table">
            <thead><tr>
              <th style="width:60px">Código</th>
              <th>Nombre</th>
              <th style="width:100px">Modo</th>
              <th style="width:80px">Tipo</th>
              <th style="width:180px">Roles</th>
              <th style="width:120px">Orden</th>
              <th style="width:120px">Acciones</th>
            </tr></thead>
            <tbody id="campos-tbody-${label.replace(/\s+/g,'-')}"></tbody>
          </table>
        </div>`;
      container.appendChild(panel);

      const tbody = panel.querySelector("tbody");
      if (sectionFields.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:1rem">Sin campos en esta sección</td></tr>';
        return;
      }
      sectionFields.forEach((c, idx) => {
        const tr = document.createElement("tr");
        const sIds = sectionFields.map(x => x.id);
        tr.innerHTML = `
          <td><span class="field-code">${c.codigo}</span></td>
          <td title="${c.nombre}">${c.nombre.length > 55 ? c.nombre.slice(0,52)+"…" : c.nombre}</td>
          <td><span class="badge ${c.modo === 'AUTOMATICA' ? 'badge-auto' : 'badge-manual'}">${c.modo}</span></td>
          <td>${c.tipo_dato || "Texto"}</td>
          <td><small style="color:var(--text-muted)">${c.rol}</small></td>
          <td>
            <div style="display:flex;gap:4px;justify-content:center">
              <button class="btn-keralty-action icon-only" title="Subir" ${idx===0?"disabled":""}>↑</button>
              <button class="btn-keralty-action icon-only" title="Bajar" ${idx===sectionFields.length-1?"disabled":""}>↓</button>
            </div>
          </td>
          <td>
            <div style="display:flex;justify-content:center">
              <button class="btn-keralty-action" title="Editar">Editar</button>
            </div>
          </td>`;
        const [upBtn, downBtn] = tr.querySelectorAll(".btn-keralty-action.icon-only");
        const editBtn = tr.querySelector('[title="Editar"]');
        if (!upBtn.disabled)   upBtn.addEventListener("click",   () => window._moveCampo(c.id, "up",   idx, sIds));
        if (!downBtn.disabled) downBtn.addEventListener("click",  () => window._moveCampo(c.id, "down", idx, sIds));
        editBtn.addEventListener("click", () => window._editCampo(c.id));
        tbody.appendChild(tr);
      });
    });
  }

  // Move campo up/down within a section
  window._moveCampo = async (id, dir, idx, sectionIds) => {
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sectionIds.length) return;

    // Build full ordered IDs array: swap the two items in their section
    // Find full position in allCampos for each section item
    const newSectionOrder = [...sectionIds];
    [newSectionOrder[idx], newSectionOrder[swapIdx]] = [newSectionOrder[swapIdx], newSectionOrder[idx]];

    // Build reorder list: all campo IDs in global order, with this section's items reordered
    const sectionSet = new Set(sectionIds);
    let sectionPtr = 0;
    const fullOrder = allCampos.map(c => {
      if (sectionSet.has(c.id)) {
        return newSectionOrder[sectionPtr++];
      }
      return c.id;
    });

    const res = await fetch("/api/admin/campos/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: fullOrder }),
    });
    if (res.ok) { await loadCampos(); }
    else { showToast("Error al reordenar", "error"); }
  };

  // Edit campo
  window._editCampo = (id) => {
    const c = allCampos.find(x => x.id === id);
    if (!c) return;
    openCampoModal(c);
  };

  function openCampoModal(campo) {
    editingCampoId = campo.id;

    $("campo-nombre").value = campo.nombre || "";
    $("campo-comentario").value = campo.comentario || "";

    // Set role checkboxes
    const roles = campo.rol ? campo.rol.split(",").map(r => r.trim()) : [];
    $("campo-rol-g1").checked = roles.includes("GESTOR 1");
    $("campo-rol-g2").checked = roles.includes("GESTOR 2");
    $("campo-rol-li").checked = roles.includes("LIDER");
    $("campo-rol-co").checked = roles.includes("CONTRALOR");
    $("campo-rol-ad").checked = roles.includes("ADMIN");

    // Set obligatorio checkboxes
    $("campo-req-crear").checked     = !!campo.requerido_crear;
    $("campo-req-g2").checked        = !!campo.requerido_g2_lider;
    $("campo-req-contralor").checked = !!campo.requerido_contralor;

    // Set dependencias
    let depCodigos = "";
    let depOp = "AND";
    if (campo.dependencias) {
      try {
        const dep = JSON.parse(campo.dependencias);
        depCodigos = (dep.campos || []).join(", ");
        depOp = dep.operador || "AND";
      } catch (_) {}
    }
    $("campo-dep-codigos").value = depCodigos;
    $("campo-dep-and").checked = depOp === "AND";
    $("campo-dep-or").checked  = depOp === "OR";

    $("campo-modal-overlay").classList.remove("hidden");
    $("campo-nombre").focus();
  }

  function closeCampoModal() {
    $("campo-modal-overlay").classList.add("hidden");
    editingCampoId = null;
  }

  $("btn-cancel-campo").addEventListener("click", closeCampoModal);
  $("btn-cancel-campo2").addEventListener("click", closeCampoModal);
  $("campo-modal-overlay").addEventListener("click", e => {
    if (e.target === $("campo-modal-overlay")) closeCampoModal();
  });

  $("campos-search").addEventListener("input", renderCampos);
  $("btn-campos-back").addEventListener("click", () => showSection(mainSection));

  // ---------------------------------------------------------------
  // ADMIN: Códigos de Ciudad
  // ---------------------------------------------------------------
  let _ciudadCodigosData = [];
  let _editingCiudadCodigoId = null;

  async function loadCiudadCodigos() {
    try {
      const res = await fetch("/api/ciudad-codigos");
      if (!res.ok) return;
      _ciudadCodigosData = await res.json();
      renderCiudadCodigosTable(_ciudadCodigosData);
    } catch (_) {}
  }

  function renderCiudadCodigosTable(data) {
    const container = $("ciudad-codigos-table-container");
    $("ciudad-codigos-count").textContent = `${data.length} código${data.length !== 1 ? "s" : ""}`;
    if (!data.length) {
      container.innerHTML = '<p class="notif-empty">No hay códigos configurados.</p>';
      return;
    }
    const table = document.createElement("table");
    table.className = "keralty-table";
    table.innerHTML = `
      <thead><tr>
        <th>Ciudad</th><th>Código</th><th>Estado</th><th style="width:120px">Acciones</th>
      </tr></thead>
      <tbody></tbody>`;
    const tbody = table.querySelector("tbody");
    for (const cc of data) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(cc.ciudad)}</td>
        <td><strong>${escapeHtml(cc.codigo)}</strong></td>
        <td><span class="${cc.activo ? "badge-active" : "badge-inactive"}">${cc.activo ? "Activo" : "Inactivo"}</span></td>
        <td>
          <div style="display:flex;gap:4px">
            <button class="btn-keralty-action btn-edit-record" data-id="${cc.id}">Editar</button>
            <button class="btn-keralty-action danger btn-delete-record" data-id="${cc.id}">Eliminar</button>
          </div>
        </td>`;
      tr.querySelector(".btn-edit-record").addEventListener("click", () => openCiudadCodigoModal(cc));
      tr.querySelector(".btn-delete-record").addEventListener("click", async () => {
        if (!confirm(`¿Eliminar el código ${cc.codigo} de ${cc.ciudad}?`)) return;
        await fetch(`/api/ciudad-codigos/${cc.id}`, { method: "DELETE" });
        await loadCiudadCodigos();
      });
      tbody.appendChild(tr);
    }
    container.innerHTML = "";
    container.appendChild(table);
  }

  function openCiudadCodigoModal(cc = null) {
    _editingCiudadCodigoId = cc ? cc.id : null;
    $("ciudad-codigo-modal-title").textContent = cc ? "Editar código de ciudad" : "Nuevo código de ciudad";
    $("ciudad-codigo-id").value = cc ? cc.id : "";
    $("ciudad-codigo-ciudad").value = cc ? cc.ciudad : "";
    $("ciudad-codigo-codigo").value = cc ? cc.codigo : "";
    $("ciudad-codigo-activo").checked = cc ? !!cc.activo : true;
    $("ciudad-codigo-modal-overlay").classList.remove("hidden");
  }

  function closeCiudadCodigoModal() {
    $("ciudad-codigo-modal-overlay").classList.add("hidden");
    _editingCiudadCodigoId = null;
  }

  $("btn-nuevo-ciudad-codigo").addEventListener("click", () => openCiudadCodigoModal());
  $("btn-cancel-ciudad-codigo").addEventListener("click", closeCiudadCodigoModal);
  $("btn-cancel-ciudad-codigo2").addEventListener("click", closeCiudadCodigoModal);
  $("ciudad-codigo-modal-overlay").addEventListener("click", e => {
    if (e.target === $("ciudad-codigo-modal-overlay")) closeCiudadCodigoModal();
  });

  $("btn-save-ciudad-codigo").addEventListener("click", async () => {
    const ciudad = $("ciudad-codigo-ciudad").value.trim();
    const codigo = $("ciudad-codigo-codigo").value.trim().toUpperCase();
    const activo = $("ciudad-codigo-activo").checked ? 1 : 0;
    if (!ciudad || !codigo) { showToast("Ciudad y código son requeridos", "error"); return; }

    const isEdit = !!_editingCiudadCodigoId;
    const url = isEdit ? `/api/ciudad-codigos/${_editingCiudadCodigoId}` : "/api/ciudad-codigos";
    const method = isEdit ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ciudad, codigo, activo }),
    });
    if (res.ok) {
      showToast(isEdit ? "Código actualizado" : "Código creado", "success");
      closeCiudadCodigoModal();
      await loadCiudadCodigos();
    } else {
      const d = await res.json();
      showToast(d.error || "Error al guardar", "error");
    }
  });

  $("btn-ciudad-codigos-back").addEventListener("click", () => showSection(mainSection));

  $("btn-save-campo").addEventListener("click", async () => {
    const rolChecks = [
      { el: $("campo-rol-g1"), val: "GESTOR 1" },
      { el: $("campo-rol-g2"), val: "GESTOR 2" },
      { el: $("campo-rol-li"), val: "LIDER" },
      { el: $("campo-rol-co"), val: "CONTRALOR" },
      { el: $("campo-rol-ad"), val: "ADMIN" },
    ];
    const selectedRoles = rolChecks.filter(r => r.el.checked).map(r => r.val);

    // Construir dependencias JSON si se definieron códigos
    const depCodigosRaw = $("campo-dep-codigos").value.trim();
    const depCampos = depCodigosRaw
      ? depCodigosRaw.split(",").map(s => s.trim().toUpperCase()).filter(Boolean)
      : [];
    const depOperador = $("campo-dep-and").checked ? "AND" : "OR";
    const dependenciasJson = depCampos.length
      ? JSON.stringify({ campos: depCampos, operador: depOperador })
      : null;

    const payload = {
      nombre: $("campo-nombre").value.trim(),
      comentario: $("campo-comentario").value.trim() || null,
      rol: selectedRoles.join(","),
      requerido_crear:     $("campo-req-crear").checked     ? 1 : 0,
      requerido_g2_lider:  $("campo-req-g2").checked        ? 1 : 0,
      requerido_contralor: $("campo-req-contralor").checked ? 1 : 0,
      dependencias:        dependenciasJson,
    };

    if (!payload.nombre) { showToast("El nombre es requerido", "error"); return; }
    if (!payload.rol) { showToast("Seleccione al menos un rol", "error"); return; }
    if (!editingCampoId) { showToast("No hay campo seleccionado", "error"); return; }

    const res = await fetch(`/api/admin/campos/${editingCampoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    if (res.ok) {
      showToast("Campo actualizado", "success");
      closeCampoModal();
      await loadCampos();
    } else {
      showToast(d.error || "Error al guardar", "error");
    }
  });

  // ---------------------------------------------------------------
  // AUDIT LOG
  // ---------------------------------------------------------------
  let _auditCurrentPage = 1;

  async function loadAudit(page = 1) {
    _auditCurrentPage = page;
    const usuario = ($("audit-filter-usuario").value || "").trim();
    const accion  = ($("audit-filter-accion").value || "").trim();
    const tipo    = ($("audit-filter-tipo").value || "").trim();
    const registro = ($("audit-filter-registro").value || "").trim();

    const params = new URLSearchParams({ page });
    if (usuario)  params.set("usuario", usuario);
    if (accion)   params.set("accion", accion);
    if (tipo)     params.set("tipo", tipo);
    if (registro) params.set("consecutivo", registro);

    let data;
    try {
      const res = await fetch(`/api/admin/audit?${params}`);
      if (!res.ok) {
        $("audit-table-container").innerHTML = '<p style="color:#DC2626">Error al cargar el log de auditoría.</p>';
        return;
      }
      data = await res.json();
    } catch (_) {
      $("audit-table-container").innerHTML = '<p style="color:#DC2626">Error de red al cargar auditoría.</p>';
      return;
    }

    $("audit-count").textContent = `${data.total} registro${data.total !== 1 ? "s" : ""}`;

    const container = $("audit-table-container");
    if (!data.items || data.items.length === 0) {
      container.innerHTML = '<p class="notif-empty">No hay entradas en el log para los filtros aplicados.</p>';
      $("audit-pagination").innerHTML = "";
      return;
    }

    const table = document.createElement("table");
    table.className = "keralty-table audit-table";
    table.innerHTML = `
      <thead><tr>
        <th>Fecha</th>
        <th>Consecutivo</th>
        <th>Prestador</th>
        <th>Usuario</th>
        <th>Rol</th>
        <th>Tipo</th>
        <th>Acci&oacute;n</th>
        <th>Motivo Cierre</th>
        <th>Detalle</th>
      </tr></thead>
      <tbody></tbody>`;
    const tbody = table.querySelector("tbody");

    for (const item of data.items) {
      const tr = document.createElement("tr");
      const fechaStr = formatDate(item.fecha);
      const tipoBadge = item.es_autorizado
        ? '<span class="audit-badge-autorizado">Autorizado</span>'
        : '<span class="audit-badge-tercero">Tercero</span>';
      const accionBadge = item.accion === "eliminacion"
        ? '<span class="audit-badge-eliminacion">Eliminaci&oacute;n</span>'
        : '<span class="audit-badge-modificacion">Modificaci&oacute;n</span>';

      const motivoCierreHtml = item.motivo_comentario
        ? `<span style="font-size:.8rem;color:#991B1B">${escapeHtml(item.motivo_comentario)}</span>`
        : `<span style="color:#CBD5E1;font-size:.78rem">—</span>`;
      tr.innerHTML = `
        <td style="white-space:nowrap">${escapeHtml(fechaStr)}</td>
        <td>${escapeHtml(item.consecutivo || "")}</td>
        <td>${escapeHtml(item.nombre_prestador || "")}</td>
        <td>${escapeHtml(item.usuario)}</td>
        <td style="font-size:.78rem;color:#64748B">${escapeHtml(item.rol || "")}</td>
        <td>${tipoBadge}</td>
        <td>${accionBadge}</td>
        <td style="max-width:200px;word-break:break-word">${motivoCierreHtml}</td>
        <td class="audit-detail-cell"></td>`;

      const detailCell = tr.querySelector(".audit-detail-cell");
      let diff = {};
      try { diff = JSON.parse(item.campos_diff || "{}"); } catch (_) {}
      const diffKeys = Object.keys(diff);

      if (diffKeys.length === 0) {
        detailCell.innerHTML = '<span style="color:#94A3B8;font-size:.78rem">Sin cambios</span>';
      } else {
        const toggleBtn = document.createElement("button");
        toggleBtn.className = "btn-keralty-action audit-diff-toggle";
        toggleBtn.textContent = `Ver cambios (${diffKeys.length})`;
        const detailDiv = document.createElement("div");
        detailDiv.className = "audit-diff-detail";
        detailDiv.style.display = "none";
        detailDiv.innerHTML = diffKeys.map(campo => {
          const entry = diff[campo];
          const antes = entry.antes !== null && entry.antes !== undefined ? escapeHtml(String(entry.antes)) : '<em>vacío</em>';
          const despues = entry.despues !== null && entry.despues !== undefined ? escapeHtml(String(entry.despues)) : '<em>eliminado</em>';
          return `<div class="audit-diff-row">
            <span class="audit-diff-campo">${escapeHtml(campo)}</span>
            <span class="audit-diff-antes">&#8592; ${antes}</span>
            <span class="audit-diff-despues">&#8594; ${despues}</span>
          </div>`;
        }).join("");
        toggleBtn.addEventListener("click", () => {
          const visible = detailDiv.style.display !== "none";
          detailDiv.style.display = visible ? "none" : "block";
          toggleBtn.textContent = visible ? `Ver cambios (${diffKeys.length})` : `Ocultar cambios`;
        });
        detailCell.appendChild(toggleBtn);
        detailCell.appendChild(detailDiv);
      }

      tbody.appendChild(tr);
    }

    container.innerHTML = "";
    container.appendChild(table);

    // Pagination
    const totalPages = Math.ceil(data.total / data.per_page);
    const pag = $("audit-pagination");
    pag.innerHTML = "";
    if (totalPages <= 1) return;

    const mkBtn = (label, p, disabled = false) => {
      const btn = document.createElement("button");
      btn.className = "btn-outline btn-sm";
      btn.textContent = label;
      btn.disabled = disabled;
      if (!disabled) btn.addEventListener("click", () => loadAudit(p));
      return btn;
    };

    pag.appendChild(mkBtn("‹ Anterior", page - 1, page <= 1));
    for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) {
      const btn = mkBtn(String(p), p);
      if (p === page) btn.style.fontWeight = "700";
      pag.appendChild(btn);
    }
    pag.appendChild(mkBtn("Siguiente ›", page + 1, page >= totalPages));
  }

  $("btn-audit-back").addEventListener("click", () => showSection(mainSection));
  $("btn-auditorias-activas-back")?.addEventListener("click", () => showSection(mainSection));
  $("btn-sso-access-requests-back")?.addEventListener("click", () => showSection(mainSection));
  $("btn-sso-ar-buscar")?.addEventListener("click", loadSsoAccessRequests);
  $("sso-ar-filter-estado")?.addEventListener("change", loadSsoAccessRequests);
  $("btn-audit-buscar").addEventListener("click", () => loadAudit(1));
  $("audit-filter-usuario").addEventListener("keydown", e => { if (e.key === "Enter") loadAudit(1); });
  $("audit-filter-registro").addEventListener("keydown", e => { if (e.key === "Enter") loadAudit(1); });
  $("btn-audit-export").addEventListener("click", () => {
    const usuario  = ($("audit-filter-usuario").value || "").trim();
    const accion   = ($("audit-filter-accion").value || "").trim();
    const tipo     = ($("audit-filter-tipo").value || "").trim();
    const registro = ($("audit-filter-registro").value || "").trim();
    const params   = new URLSearchParams();
    if (usuario)  params.set("usuario", usuario);
    if (accion)   params.set("accion", accion);
    if (tipo)     params.set("tipo", tipo);
    if (registro) params.set("registro_id", registro);
    window.location.href = `${BASE}/api/admin/audit/export?${params.toString()}`;
  });

  // ---------------------------------------------------------------
  // EVALUADOR DE FÓRMULAS — Campos automáticos
  // ---------------------------------------------------------------
  // Cache de festivos para NETWORKDAYS (se carga una vez al iniciar sesión)
  let _festivosSet = null;

  async function _loadFestivosSet() {
    if (_festivosSet) return _festivosSet;
    try {
      const res = await fetch("/api/festivos");
      if (!res.ok) { _festivosSet = new Set(); return _festivosSet; }
      const data = await res.json();
      _festivosSet = new Set(data.map(f => f.fecha)); // YYYY-MM-DD strings
    } catch { _festivosSet = new Set(); }
    return _festivosSet;
  }

  // Mapeo de columnas de Tabla5 (BD_PRESTADORES) según índice de la fórmula Excel
  const _PREST_COL_MAP = {
    36: "tipo_prestador",
    37: "naturaleza_ips",
    38: "tipo_atencion",
    39: "premium",
    40: "glosa_sostenida",
    41: "prioridad_servicio",
  };

  // Convierte valor de campo a número (para cálculos)
  function _numVal(v) {
    if (v === null || v === undefined || v === "") return 0;
    const n = parseFloat(String(v).replace(/[,$\s]/g, ""));
    return isNaN(n) ? 0 : n;
  }

  // Calcula días hábiles entre dos fechas (NETWORKDAYS estilo Excel)
  function _networkDays(startStr, endStr, festSet) {
    if (!startStr || !endStr) return 0;
    const start = new Date(startStr + "T12:00:00");
    const end   = new Date(endStr   + "T12:00:00");
    if (isNaN(start) || isNaN(end)) return 0;
    let days  = 0;
    let step  = start <= end ? 1 : -1;
    let count = 0;
    const cur = new Date(start);
    while ((step === 1 ? cur <= end : cur >= end) && count < 3650) {
      const dow = cur.getDay();
      const iso = cur.toISOString().slice(0, 10);
      if (dow !== 0 && dow !== 6 && !festSet.has(iso)) days += step;
      cur.setDate(cur.getDate() + step);
      count++;
    }
    return days;
  }

  // Parsea una referencia de campo de la fórmula Excel (ej: "AJ9", "AI8", "BF54") → código
  function _parseRef(token) {
    return token.replace(/\d+/g, "").toUpperCase();
  }

  // Extrae códigos de campo de un rango Excel (ej: "S8:AA8") → ["S","T","U","V","W","X","Y","Z","AA"]
  function _expandRange(fromCode, toCode) {
    // Genera secuencia de códigos Excel entre fromCode y toCode
    function nextCode(c) {
      if (!c) return "A";
      const last = c[c.length - 1];
      if (last < "Z") return c.slice(0, -1) + String.fromCharCode(last.charCodeAt(0) + 1);
      return nextCode(c.slice(0, -1)) + "A";
    }
    const result = [];
    let cur = fromCode;
    let guard = 0;
    while (cur !== toCode && guard < 200) { result.push(cur); cur = nextCode(cur); guard++; }
    result.push(toCode);
    return result;
  }

  // Evaluador principal de fórmula
  // formula: string de fórmula Excel, getField: (code) => value, prestData: objeto prestador
  function _evalFormula(formula, getField, prestData, festSet) {
    if (!formula) return "";
    const f = formula.trim();

    // Normalizar separadores de función (;  →  ,)
    const norm = f.replace(/;/g, ",");

    // --- VLOOKUP desde BD_PRESTADORES (NIT) ---
    if (/VLOOKUP\s*\(\s*\[@\[NIT\s+PRESTADOR/i.test(norm) || /VLOOKUP\s*\(\s*@NIT/i.test(norm)) {
      const colMatch = norm.match(/,\s*(\d+)\s*,\s*0\s*\)/);
      if (colMatch && prestData) {
        const colIdx = parseInt(colMatch[1]);
        const campo  = _PREST_COL_MAP[colIdx];
        return campo ? (prestData[campo] ?? "") : "";
      }
      return "";
    }

    // --- VLOOKUP de ciudad (campo F → ciudad_cod_dane / departamento) ---
    if (/VLOOKUP\s*\(\s*F\d*/i.test(norm)) {
      const colMatch = norm.match(/,\s*(\d+)\s*,\s*0/);
      if (colMatch && prestData) {
        const colIdx = parseInt(colMatch[1]);
        if (colIdx === 2) return prestData.ciudad_cod_dane ?? "";
        if (colIdx === 3) return prestData.departamento    ?? "";
      }
      return "";
    }

    // --- Referencia simple a un campo (sin función) ej: "AI" ---
    if (/^[A-Z]{1,3}\d*$/.test(norm)) {
      return getField(_parseRef(norm)) ?? "";
    }

    // --- SUM / SUMA con rango o lista ---
    const sumMatch = norm.match(/^(?:SUMA|SUM)\s*\((.+)\)$/i);
    if (sumMatch) {
      let total = 0;
      const args = sumMatch[1].split(",");
      for (const arg of args) {
        const a = arg.trim();
        const rangeMatch = a.match(/^([A-Z]{1,3})\d*:([A-Z]{1,3})\d*$/i);
        if (rangeMatch) {
          const codes = _expandRange(rangeMatch[1].toUpperCase(), rangeMatch[2].toUpperCase());
          codes.forEach(c => { total += _numVal(getField(c)); });
        } else {
          total += _numVal(getField(_parseRef(a)));
        }
      }
      return total;
    }

    // --- IGUAL / EXACT ---
    const igualMatch = norm.match(/^(?:IGUAL|EXACT)\s*\((.+),(.+)\)$/i);
    if (igualMatch) {
      const a = String(getField(_parseRef(igualMatch[1].trim())) ?? "");
      const b = String(getField(_parseRef(igualMatch[2].trim())) ?? "");
      return a === b ? "VERDADERO" : "FALSO";
    }

    // --- NETWORKDAYS ---
    const nwMatch = norm.match(/^(?:IF\s*\(.+\))$/i) || null;
    // Manejo específico para los 3 patrones NETWORKDAYS del formulario
    // CT: IF(AND(AL="",N=""),0,IF(AL="",-1+NETWORKDAYS(N,TODAY()),NETWORKDAYS(N,AL)))
    if (/NETWORKDAYS/i.test(norm)) {
      const fieldN  = getField("N")  || "";
      const fieldAL = getField("AL") || "";
      const fieldAM = getField("AM") || "";
      const fieldQ  = getField("Q")  || "";
      // CT: NETWORKDAYS(N, AL) con caso especial TODAY
      if (/AL.*N.*AL.*TODAY|AND.*AL.*N.*NETWORKDAYS.*AL/i.test(norm)) {
        if (!fieldAL && !fieldN) return 0;
        const end = fieldAL || new Date().toISOString().slice(0, 10);
        const nd  = _networkDays(fieldN, end, festSet);
        return fieldAL ? nd : nd - 1;
      }
      // CU: NETWORKDAYS(N, AM)
      if (/AM.*N.*AM.*TODAY|AND.*AL.*N.*NETWORKDAYS.*AM/i.test(norm)) {
        if (!fieldAL && !fieldN) return 0;
        const end = fieldAM || new Date().toISOString().slice(0, 10);
        const nd  = _networkDays(fieldN, end, festSet);
        return fieldAM ? nd : nd - 1;
      }
      // CV: NETWORKDAYS(N, Q) — COVID
      if (/OR.*Q.*N|NETWORKDAYS.*N.*Q/i.test(norm)) {
        if (!fieldQ || !fieldN) return 0;
        const end = fieldQ || new Date().toISOString().slice(0, 10);
        const nd  = _networkDays(fieldN, end, festSet);
        return fieldQ ? nd : nd - 1;
      }
      return 0;
    }

    // --- SI.ERROR / IFERROR wrapping aritmética simple ---
    const iferrMatch = norm.match(/^(?:SI\.ERROR|IFERROR)\s*\((.+),\s*(.+)\)$/i);
    if (iferrMatch) {
      try {
        const inner = _evalFormula(iferrMatch[1].trim(), getField, prestData, festSet);
        if (inner === "" || inner === null || inner === undefined || isNaN(Number(inner))) {
          return _evalFormula(iferrMatch[2].trim(), getField, prestData, festSet);
        }
        return inner;
      } catch { return _evalFormula(iferrMatch[2].trim(), getField, prestData, festSet); }
    }

    // --- IF simple ---
    const ifMatch = norm.match(/^IF\s*\((.+)\)$/i);
    if (ifMatch) {
      // Manejar IF(E<>"", SUM(...), "")  y  DO: DN=AJ
      const inner = ifMatch[1];
      // Caso: IF(E<>"", expr, fallback)
      const simpleIfMatch = inner.match(/^([A-Z]{1,3})\d*\s*<>\s*""\s*,\s*(.+),\s*""\s*$/i);
      if (simpleIfMatch) {
        const condVal = getField(simpleIfMatch[1].toUpperCase());
        if (condVal && condVal !== "") {
          return _evalFormula(simpleIfMatch[2].trim(), getField, prestData, festSet);
        }
        return "";
      }
      return "";
    }

    // --- Igualdad simple: DN8=AJ8 ---
    const eqMatch = norm.match(/^([A-Z]{1,3})\d*\s*=\s*([A-Z]{1,3})\d*$/i);
    if (eqMatch) {
      const a = String(getField(eqMatch[1].toUpperCase()) ?? "");
      const b = String(getField(eqMatch[2].toUpperCase()) ?? "");
      return a === b ? "VERDADERO" : "FALSO";
    }

    // --- Aritmética simple: AJ-BF, BF/AJ, BJ-AM ---
    const arithMatch = norm.match(/^([A-Z]{1,3})\d*\s*([-+*/])\s*([A-Z]{1,3})\d*$/i);
    if (arithMatch) {
      const op   = arithMatch[2];
      const rawA = getField(arithMatch[1].toUpperCase()) || "";
      const rawB = getField(arithMatch[3].toUpperCase()) || "";
      // Resta de fechas: si ambos valores son fechas ISO (YYYY-MM-DD), retorna días de diferencia
      if (op === "-" && rawA && rawB) {
        const dA = new Date(rawA); const dB = new Date(rawB);
        if (!isNaN(dA) && !isNaN(dB) && /^\d{4}-\d{2}-\d{2}/.test(rawA) && /^\d{4}-\d{2}-\d{2}/.test(rawB)) {
          return Math.round((dA - dB) / 86400000);
        }
      }
      // Resta donde al menos un operando es fecha ISO pero el otro está vacío:
      // devolver "" para no generar números espurios (ej. parseFloat("2025-05-01") = 2025).
      // Esto mantiene BZ vacío cuando BJ (fecha tentativa) aún no está ingresada.
      if (op === "-" && (/^\d{4}-\d{2}-\d{2}/.test(rawA) || /^\d{4}-\d{2}-\d{2}/.test(rawB))) {
        return "";
      }
      const a = _numVal(rawA);
      const b = _numVal(rawB);
      if (op === "+" ) return a + b;
      if (op === "-" ) return a - b;
      if (op === "*" ) return a * b;
      if (op === "/" ) return b !== 0 ? a / b : 0;
    }

    // --- CONTAR_CUOTAS: cuenta cuotas g2 con monto > 0 Y fecha tentativa completa ---
    // Regla: si CI es "NO" o "NO APLICA", devolver 0
    if (/^CONTAR_CUOTAS$/i.test(norm)) {
      const ciVal = (getField("CI") || "").trim().toUpperCase();
      if (ciVal === "NO" || ciVal === "NO APLICA") {
        return 0;
      }
      let count = 0;
      for (const def of _CUOTA_DEF) {
        const montoEl = document.querySelector(`[data-field-code="${def.monto}"]`);
        if (!montoEl) continue;
        const montoRaw = montoEl.dataset.rawValue || montoEl.value || "";
        const montoNum = parseFloat(montoRaw);
        const fechaVal = getField(def.fecha_tent) || "";
        if (!isNaN(montoNum) && montoNum > 0 && fechaVal !== "") count++;
      }
      return count;
    }

    return "";
  }

  // Recalcula todos los campos automáticos/formulados en el formulario activo
  async function recalcFormulas(changedCode, prestData) {
    const festSet = await _loadFestivosSet();

    const getField = (code) => {
      const el = document.querySelector(`[data-field-code="${code}"]`);
      if (!el) return null;
      // Porcentaje automático: devolver el decimal raw, no el display "XX%"
      if (el.dataset.percentAuto === "true") return el.dataset.rawValue ?? el.value;
      return el.value;
    };
    const setField = (code, value) => {
      const el = document.querySelector(`[data-field-code="${code}"]`);
      if (el) {
        // Permitir establecer valores incluso si está disabled (campos automáticos)
        if (el.dataset.percentAuto === "true") {
          el.dataset.rawValue = value !== null && value !== undefined ? String(value) : "";
          el.value = _formatPercent(value);
        } else if (el.dataset.currency === "true") {
          const raw = value !== null && value !== undefined ? String(value) : "";
          el.dataset.rawValue = raw;
          el.value = raw !== "" ? _formatCurrencyDisplay(raw) : "";
        } else {
          el.value = value !== null && value !== undefined ? value : "";
        }
      }
    };

    // Construir lista de campos a recalcular.
    // Primero consultar el DOM (cubre TODAS las secciones renderizadas, incluyendo las de
    // roles inferiores que no forman parte de currentFields del rol de sesión).
    // Esto soluciona que ADMIN (sin campos propios) y CONTRALOR (sin BZ en su rol)
    // no recalculen campos AUTOMATICA que están en secciones inferiores.
    const _autoEls = [...dynamicForm.querySelectorAll('[data-field-modo="AUTOMATICA"][data-field-formula]')];
    const _domCodes = new Set();
    const _fieldsToRecalc = [];
    for (const el of _autoEls) {
      const cod = el.dataset.fieldCode;
      if (!cod || _domCodes.has(cod)) continue;
      _domCodes.add(cod);
      _fieldsToRecalc.push({ codigo: cod, formula: el.dataset.fieldFormula, tipo_dato: el.dataset.tipoDato || "" });
    }
    // Fallback: campos AUTOMATICA de currentFields que no hayan aparecido en el DOM
    // (ej. campos ocultos por dependencias que no generaron elemento visible)
    for (const f of (currentFields || [])) {
      if (f.modo === "AUTOMATICA" && f.formula && !_domCodes.has(f.codigo)) {
        _fieldsToRecalc.push(f);
      }
    }
    if (_fieldsToRecalc.length === 0) return;

    for (const field of _fieldsToRecalc) {
      const val = _evalFormula(field.formula, getField, prestData, festSet);
      // Actualizar siempre que la evaluación no falle (null/undefined = error).
      // Si val = "" (fuente vacía o borrada), limpiar el campo calculado.
      // Si val = 0 (suma de vacíos), escribir 0.
      if (val !== null && val !== undefined) {
        setField(field.codigo, val);
      }
      // Semáforo: verde/rojo para campos calculados numéricos
      if (_NUMERIC_TIPOS.has((field.tipo_dato || "").toLowerCase())) {
        _applyCalcFieldStyle(field.codigo, val);
      }
      // Toast específico para BZ negativo
      if (field.codigo === "BZ") {
        const bzEl = document.querySelector('[data-field-code="BZ"]');
        if (bzEl) {
          const num = parseFloat(val);
          if (!isNaN(num) && num < 0) {
            if (!bzEl.dataset.negWarnShown) {
              bzEl.dataset.negWarnShown = "1";
              showToast("⚠️ TÉRMINO DE PAGO INICIAL [BZ]: valor negativo — la fecha tentativa es anterior a la firma del acta.", "warning", 6000);
            }
          } else {
            delete bzEl.dataset.negWarnShown;
          }
        }
      }
    }
    _validarCuotasSinBF();
  }

  // ---------------------------------------------------------------
  // ---------------------------------------------------------------
  // AC Modal Handlers — confirmar cierre → aplicar bloqueo de formulario
  // ---------------------------------------------------------------
  // AC Modal Handlers
  // ---------------------------------------------------------------
  const _acCloseOkBtn     = document.getElementById("btn-ac-close-ok");
  const _acCloseCancelBtn = document.getElementById("btn-ac-close-cancel");
  const _acCloseModal     = document.getElementById("ac-close-modal-overlay");
  let _acCurrentElement   = null;   // el select de AC que abrió el modal
  let _acPrevValue        = null;   // valor de AC antes de seleccionar el cierre

  if (_acCloseOkBtn) {
    _acCloseOkBtn.addEventListener("click", async () => {
      // 1. Limpiar campos AH–CE (igual que BD, excluyendo BD y AC)
      const _AC_CLEAR_CODES = [
        "AH","AI","AJ","AK","AL","AM","AN","AO","AP","AQ","AR","AS","AT","AU","AV","AW","AX","AY","AZ",
        "BA","BB","BC",  /* BD se omite — no se borra */
        "BE","BF","BG","BH","BI","BJ","BK","BL","BM","BN","BO","BP","BQ","BR","BS","BT","BU","BV","BW","BX","BY","BZ",
        "CA","CB","CC","CD","CE"
      ];
      _AC_CLEAR_CODES.forEach(code => {
        const fieldEl = dynamicForm.querySelector(`[data-field-code="${code}"]`);
        if (fieldEl) {
          fieldEl.value = "";
          if (fieldEl.dataset.rawValue !== undefined) fieldEl.dataset.rawValue = "";
          fieldEl.classList.remove("field-required-error");
        }
      });

      // 2. Auto-completar CG con la fecha de hoy
      const _cgEl = dynamicForm.querySelector('[data-field-code="CG"]');
      if (_cgEl) {
        const _hoyAC = new Date();
        _cgEl.value = `${_hoyAC.getFullYear()}-${String(_hoyAC.getMonth() + 1).padStart(2, '0')}-${String(_hoyAC.getDate()).padStart(2, '0')}`;
      }

      // 3. Aplicar bloqueo de formulario por AC cierre
      _applyACCierreLock();
      _setCFCGVisibility(true, false);
      _scrollToCFCG();

      // 4. Recalcular campos automáticos
      await recalcFormulas(null, _currentPrestData);

      // 5. Confirmar
      showToast("✓ Campos AH–CE eliminados. Formulario bloqueado por cierre AC.", "success");

      // 6. Cerrar modal
      if (_acCloseModal) _acCloseModal.classList.add("hidden");

      // 7. Actualizar _prevACValue en el elemento (valor de cierre ya confirmado)
      if (_acCurrentElement) {
        _acCurrentElement.dataset._prevACValue = _acCurrentElement.value;
      }

      // 8. Marcar formulario como modificado
      checkDirty();
    });
  }

  if (_acCloseCancelBtn) {
    _acCloseCancelBtn.addEventListener("click", () => {
      // Cancelar: revertir el valor de AC al anterior
      if (_acCurrentElement && _acPrevValue !== null) {
        _acCurrentElement.value = _acPrevValue;
        _acCurrentElement.dataset._prevACValue = _acPrevValue;
      }
      showToast("Cambio cancelado", "info");
      if (_acCloseModal) _acCloseModal.classList.add("hidden");
    });
  }

  // BD Modal Handlers
  // ---------------------------------------------------------------
  const bdCloseOkBtn = document.getElementById("btn-bd-close-ok");
  const bdCloseCancelBtn = document.getElementById("btn-bd-close-cancel");
  const bdCloseModal = document.getElementById("bd-close-modal-overlay");
  let _bdCurrentElement = null;
  let _bdPrevValue = null;

  if (bdCloseOkBtn) {
    bdCloseOkBtn.addEventListener("click", async () => {
      // Confirmar: limpiar campos AH hasta CE (SIN incluir BD)
      const _BD_CLEAR_CODES = [
        "AH","AI","AJ","AK","AL","AM","AN","AO","AP","AQ","AR","AS","AT","AU","AV","AW","AX","AY","AZ",
        "BA","BB","BC",      /* BD se omite — no se borra a sí mismo */
        "BE","BF","BG","BH","BI","BJ","BK","BL","BM","BN","BO","BP","BQ","BR","BS","BT","BU","BV","BW","BX","BY","BZ",
        "CA","CB","CC","CD","CE"
      ];

      // Limpiar valores en el formulario
      _BD_CLEAR_CODES.forEach(code => {
        const fieldEl = dynamicForm.querySelector(`[name="field_${code}"], [id="field_${code}"]`);
        if (fieldEl) {
          fieldEl.value = "";
          fieldEl.dataset.rawValue = "";
          fieldEl.classList.remove("field-required-error");
        }
      });

      // Auto-completar CG con la fecha de hoy
      const _cgElBD = dynamicForm.querySelector('[data-field-code="CG"]');
      if (_cgElBD) {
        const _hoyBD = new Date();
        _cgElBD.value = `${_hoyBD.getFullYear()}-${String(_hoyBD.getMonth() + 1).padStart(2, '0')}-${String(_hoyBD.getDate()).padStart(2, '0')}`;
      }

      // Aplicar bloqueo de formulario por BD cierre
      _applyBDCierreLock();
      _setCFCGVisibility(true, false);
      _scrollToCFCG();

      // Recalcular campos automáticos
      await recalcFormulas(null, _currentPrestData);

      // Mostrar confirmación
      showToast("✓ Campos AH–CE eliminados (excepto BD). Formulario bloqueado por cierre BD.", "success");

      // Cerrar modal
      if (bdCloseModal) {
        bdCloseModal.classList.add("hidden");
      }

      // Marcar como dirty
      checkDirty();
    });
  }

  if (bdCloseCancelBtn) {
    bdCloseCancelBtn.addEventListener("click", () => {
      // Cancelar: revertir el valor de BD al anterior
      const bdField = dynamicForm.querySelector('[name="field_BD"], [id="field_BD"], [data-field-code="BD"]');
      if (bdField && _bdPrevValue !== null) {
        bdField.value = _bdPrevValue;
        bdField.dataset._prevBDValue = _bdPrevValue;
      }

      showToast("Cambio cancelado", "info");

      // Cerrar modal
      if (bdCloseModal) {
        bdCloseModal.classList.add("hidden");
      }
    });
  }

  // CE Modal Handlers
  // ---------------------------------------------------------------
  const ceCloseOkBtn = document.getElementById("btn-ce-close-ok");
  const ceCloseCancelBtn = document.getElementById("btn-ce-close-cancel");
  const ceCloseModal = document.getElementById("ce-close-modal-overlay");
  let _ceCurrentElement = null;
  let _cePrevValue = null;

  if (ceCloseOkBtn) {
    ceCloseOkBtn.addEventListener("click", async () => {
      // Auto-completar CG con la fecha de hoy
      const _cgElCE = dynamicForm.querySelector('[data-field-code="CG"]');
      if (_cgElCE) {
        const _hoyCE = new Date();
        _cgElCE.value = `${_hoyCE.getFullYear()}-${String(_hoyCE.getMonth() + 1).padStart(2, '0')}-${String(_hoyCE.getDate()).padStart(2, '0')}`;
      }

      // Aplicar bloqueo de formulario por CE cierre
      _applyCECierreLock();
      _setCFCGVisibility(true, false);
      _scrollToCFCG();

      // Recalcular campos automáticos
      await recalcFormulas(null, _currentPrestData);

      showToast("✓ Formulario bloqueado por cierre CE. Solo CF y CG son editables.", "success");

      if (ceCloseModal) ceCloseModal.classList.add("hidden");
      checkDirty();
    });
  }

  if (ceCloseCancelBtn) {
    ceCloseCancelBtn.addEventListener("click", () => {
      // Cancelar: revertir el valor de CE al anterior
      const ceField = dynamicForm.querySelector('[data-field-code="CE"]');
      if (ceField && _cePrevValue !== null) {
        ceField.value = _cePrevValue;
        ceField.dataset._prevCEValue = _cePrevValue;
      }
      showToast("Cambio cancelado", "info");
      if (ceCloseModal) ceCloseModal.classList.add("hidden");
    });
  }

  // ---------------------------------------------------------------
  // PARTIR GLOSA - Modal y funcionalidad
  // ---------------------------------------------------------------
  const btnPartirGlosa = $("btn-partir-glosa");
  const partirGlosaModal = $("partir-glosa-modal-overlay");
  const btnPartirSiguiente = $("btn-partir-siguiente");
  const btnPartirConfirmar = $("btn-partir-confirmar");
  const btnPartirAtras = $("btn-partir-atras");
  const btnPartirCancel = $("btn-partir-cancel");
  const partirStep1 = $("partir-step-1");
  const partirStep2 = $("partir-step-2");
  const partirPartesTable = $("partir-partes-table");

  const COMPANIAS = ["RÉGIMEN CONTRIBUTIVO", "NO PBS", "PLAN COMPLEMENTARIO (PES_PREMIUM)", "MOVILIDAD SUBSIDIADO"];

  // Compañías disponibles para la sesión actual de "dividir glosa"
  let _partirCompaniasDisponibles = [];
  // Valor M del registro original al partir (para validar que suma derivadas no supere original)
  let _partirMOriginal = 0;

  function _updatePartirTotal() {
    const inputs = [...document.querySelectorAll(".partir-m-input")];
    let total = 0;
    const errores = [];

    inputs.forEach((inp, i) => {
      const raw = parseInt((inp.value || "0").replace(/[^\d]/g, ""), 10);
      const esCero = isNaN(raw) || raw <= 0;
      if (!esCero) total += raw;
      // Marcar borde del input
      inp.style.borderColor = esCero ? "#dc2626" : "#ddd";
      if (esCero) errores.push(`Conciliación ${i + 1}: el valor M debe ser mayor a 0.`);
    });

    const excedeOIgual = _partirMOriginal > 0 && total >= _partirMOriginal;
    const restoVal = _partirMOriginal - total;

    // Actualizar resumen
    const elTotal = $("partir-total-m");
    if (elTotal) {
      elTotal.textContent = "$ " + total.toLocaleString("es-CO");
      elTotal.style.color = excedeOIgual ? "#dc2626" : "#2e7d32";
    }
    const elResto = $("partir-resto-m");
    if (elResto) {
      elResto.textContent = "$ " + Math.max(0, restoVal).toLocaleString("es-CO");
      elResto.style.color = (excedeOIgual || restoVal <= 0) ? "#dc2626" : "#059669";
    }

    if (excedeOIgual) {
      errores.push(`La suma de las conciliaciones nuevas ($ ${total.toLocaleString("es-CO")}) debe ser menor al M original ($ ${_partirMOriginal.toLocaleString("es-CO")}). El original debe quedar con valor mayor a 0.`);
    }

    // Mostrar alertas en tiempo real
    const elAlertas = $("partir-alertas");
    if (elAlertas) {
      elAlertas.innerHTML = "";
      if (errores.length > 0) {
        elAlertas.style.display = "flex";
        errores.forEach(msg => {
          const div = document.createElement("div");
          div.style.cssText = "background:#fef2f2;border:1px solid #fecaca;border-radius:5px;padding:.5rem .75rem;font-size:.85rem;color:#dc2626;display:flex;align-items:flex-start;gap:.4rem;";
          div.innerHTML = `<span style="flex-shrink:0;font-weight:700">⚠</span><span>${msg}</span>`;
          elAlertas.appendChild(div);
        });
      } else {
        elAlertas.style.display = "flex";
        const div = document.createElement("div");
        div.style.cssText = "background:#f0fdf4;border:1px solid #bbf7d0;border-radius:5px;padding:.5rem .75rem;font-size:.85rem;color:#16a34a;display:flex;align-items:center;gap:.4rem;";
        div.innerHTML = `<span style="font-weight:700">✓</span><span>Distribución válida. El original quedará con $ ${Math.max(0, restoVal).toLocaleString("es-CO")}.</span>`;
        elAlertas.appendChild(div);
      }
    }
  }

  btnPartirGlosa?.addEventListener("click", () => {
    if (!currentEditId) return;

    const valorA = (dynamicForm.querySelector("#field_A")?.value || "").trim();
    if (!valorA) {
      showToast("El registro no tiene consecutivo asignado (campo A).", "error");
      return;
    }

    // Capturar M original para validación de límite
    const mInputEl = dynamicForm.querySelector("[data-field-code='M']");
    _partirMOriginal = parseInt((mInputEl?.value || "0").replace(/[^\d]/g, ""), 10) || 0;
    const elMOriginalVal = $("partir-m-original-val");
    if (elMOriginalVal) elMOriginalVal.textContent = "$ " + _partirMOriginal.toLocaleString("es-CO");

    // Compañía del propio registro (campo D actual)
    const usadasSet = new Set();
    const valorD = (dynamicForm.querySelector("[name='field_D']")?.value || "").trim();
    if (valorD) usadasSet.add(valorD);

    // Compañías ya usadas en glosas derivadas existentes (A empieza con valorA + "-")
    allMainRecords.forEach(r => {
      const aVal = (r.consecutivo || "").trim();
      if (aVal.startsWith(valorA + "-")) {
        const comp = (r.compania || "").trim();
        if (comp) usadasSet.add(comp);
      }
    });

    _partirCompaniasDisponibles = COMPANIAS.filter(c => !usadasSet.has(c));

    if (_partirCompaniasDisponibles.length === 0) {
      showToast("Todas las compañías ya tienen conciliación derivada en este registro.", "warning");
      return;
    }

    // Poblar step 1 con checkboxes
    const listContainer = $("partir-companias-list");
    listContainer.innerHTML = "";
    _partirCompaniasDisponibles.forEach((comp, idx) => {
      const label = document.createElement("label");
      label.style.cssText = "display:flex;align-items:center;gap:.75rem;padding:.625rem 1rem;border:2px solid #ddd;border-radius:8px;cursor:pointer;background:white;transition:all 0.2s;";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = comp;
      cb.id = `partir-cb-${idx}`;
      cb.style.cssText = "width:18px;height:18px;cursor:pointer;accent-color:#0B7A75;flex-shrink:0;";
      cb.addEventListener("change", () => {
        const checked = listContainer.querySelectorAll("input[type=checkbox]:checked").length;
        if (checked > 3) {
          cb.checked = false;
          showToast("Máximo 3 compañías por operación.", "warning");
          return;
        }
        label.style.borderColor = cb.checked ? "#0B7A75" : "#ddd";
        label.style.backgroundColor = cb.checked ? "#E6F5F4" : "white";
      });
      const span = document.createElement("span");
      span.style.cssText = "font-weight:500;font-size:.95rem;user-select:none;";
      span.textContent = comp;
      label.appendChild(cb);
      label.appendChild(span);
      listContainer.appendChild(label);
    });

    // Actualizar encabezado con radicado
    const infoEl = $("partir-radicado-info");
    if (infoEl) infoEl.textContent = `Radicado: ${valorA}`;

    // Resetear estado del modal
    partirStep1.style.display = "";
    partirStep2.style.display = "none";
    btnPartirSiguiente.classList.remove("hidden");
    btnPartirConfirmar.classList.add("hidden");
    btnPartirAtras.classList.add("hidden");
    partirPartesTable.innerHTML = "";
    partirGlosaModal.classList.remove("hidden");
  });

  btnPartirSiguiente?.addEventListener("click", () => {
    const listContainer = $("partir-companias-list");
    const checkedBoxes = [...listContainer.querySelectorAll("input[type=checkbox]:checked")];

    if (checkedBoxes.length === 0) {
      showToast("Seleccione al menos una compañía.", "error");
      return;
    }
    if (checkedBoxes.length > 3) {
      showToast("Máximo 3 compañías por operación.", "error");
      return;
    }

    partirStep1.style.display = "none";
    partirStep2.style.display = "";
    btnPartirSiguiente.classList.add("hidden");
    btnPartirAtras.classList.remove("hidden");
    btnPartirConfirmar.classList.remove("hidden");

    // Limpiar alertas al entrar al paso 2
    const _elAlertasReset = $("partir-alertas");
    if (_elAlertasReset) { _elAlertasReset.innerHTML = ""; _elAlertasReset.style.display = "none"; }

    // Generar tabla de paso 2: compañía como texto fijo, input M
    partirPartesTable.innerHTML = "";
    checkedBoxes.forEach((cb, i) => {
      const compania = cb.value;

      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid #e9ecef";

      const tdNum = document.createElement("td");
      tdNum.style.cssText = "padding:.75rem 1rem;font-weight:600;color:#0B7A75;white-space:nowrap;width:80px;";
      tdNum.textContent = `Conciliación ${i + 1}`;

      const tdD = document.createElement("td");
      tdD.style.padding = "0.75rem";
      const spanD = document.createElement("span");
      spanD.className = "partir-d-value";
      spanD.dataset.valor = compania;
      spanD.style.cssText = "font-size:.9rem;font-weight:500;";
      spanD.textContent = compania;
      tdD.appendChild(spanD);

      const tdM = document.createElement("td");
      tdM.style.padding = "0.75rem";
      const inputM = document.createElement("input");
      inputM.type = "text";
      inputM.className = "partir-m-input";
      inputM.placeholder = "$ 0";
      inputM.inputMode = "numeric";
      inputM.style.cssText = "width:100%;padding:.5rem;border:1px solid #ddd;border-radius:4px;font-size:.95rem;background:#fff;transition:border-color 0.2s,box-shadow 0.2s;";
      inputM.addEventListener("focus", () => {
        inputM.style.borderColor = "#0B7A75";
        inputM.style.boxShadow = "0 0 0 3px rgba(11,122,117,.1)";
      });
      inputM.addEventListener("blur", () => {
        inputM.style.borderColor = "#ddd";
        inputM.style.boxShadow = "none";
        const raw = parseInt((inputM.value || "0").replace(/[^\d]/g, ""));
        inputM.value = isNaN(raw) || raw === 0 ? "" : "$ " + raw.toLocaleString("es-CO");
        _updatePartirTotal();
      });
      inputM.addEventListener("input", () => {
        const rawValue = (inputM.value || "").replace(/[^\d]/g, "");
        if (rawValue !== "") {
          inputM.value = "$ " + parseInt(rawValue).toLocaleString("es-CO");
        }
        _updatePartirTotal();
      });
      tdM.appendChild(inputM);

      tr.appendChild(tdNum);
      tr.appendChild(tdD);
      tr.appendChild(tdM);
      partirPartesTable.appendChild(tr);
    });

    _updatePartirTotal();
  });

  btnPartirConfirmar?.addEventListener("click", async () => {
    const spanDs = [...document.querySelectorAll(".partir-d-value")];
    const inputMs = [...document.querySelectorAll(".partir-m-input")];
    const partes = [];
    let valido = true;

    spanDs.forEach((spanD, i) => {
      const D = (spanD.dataset.valor || "").trim();
      const rawM = (inputMs[i]?.value || "").replace(/[^\d]/g, "");
      const numM = parseInt(rawM, 10);

      if (!D) {
        showToast(`Conciliación ${i + 1}: compañía no definida.`, "error");
        valido = false;
        return;
      }
      if (isNaN(numM) || numM <= 0) {
        showToast(`Conciliación ${i + 1}: ingrese un valor de cartera válido (> 0).`, "error");
        valido = false;
        return;
      }
      partes.push({ D, M: numM.toString() });
    });

    if (!valido || partes.length === 0) return;

    // Validar que cada M derivada sea > 0
    for (let i = 0; i < partes.length; i++) {
      const mVal = parseInt(partes[i].M, 10) || 0;
      if (mVal <= 0) {
        showToast(`❌ Conciliación ${i + 1}: el valor M debe ser mayor a 0.`, "error");
        return;
      }
    }

    // Validar que la suma no iguale ni supere el M original (el original debe quedar > 0)
    const _totalMSum = partes.reduce((s, p) => s + (parseInt(p.M, 10) || 0), 0);
    if (_partirMOriginal > 0 && _totalMSum >= _partirMOriginal) {
      showToast(
        `❌ La suma de las conciliaciones nuevas ($ ${_totalMSum.toLocaleString("es-CO")}) debe ser menor al M original ($ ${_partirMOriginal.toLocaleString("es-CO")}). El original debe quedar con valor mayor a 0.`,
        "error"
      );
      return;
    }

    try {
      partirGlosaModal.classList.add("hidden");
      const res = await fetch(`/api/registro/${currentEditId}/partir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partes }),
      });

      const respData = await res.json();
      if (res.ok) {
        showToast(`✅ ${respData.mensaje}`, "success");
        await loadMainRecords();
        btnBack.click();
      } else {
        showToast(`❌ ${respData.detail || "Error al segmentar la conciliación."}`, "error");
        partirGlosaModal.classList.remove("hidden");
      }
    } catch (err) {
      showToast(`❌ Error al segmentar la conciliación: ${err.message}`, "error");
      partirGlosaModal.classList.remove("hidden");
    }
  });

  btnPartirAtras?.addEventListener("click", () => {
    partirStep2.style.display = "none";
    partirStep1.style.display = "";
    btnPartirSiguiente.classList.remove("hidden");
    btnPartirConfirmar.classList.add("hidden");
    btnPartirAtras.classList.add("hidden");
  });

  btnPartirCancel?.addEventListener("click", () => {
    partirGlosaModal.classList.add("hidden");
  });

  // ---------------------------------------------------------------
  // ---------------------------------------------------------------
  // AUDITORÍA DE REGISTROS
  // ---------------------------------------------------------------

  let _auditoriaModalRegistroId = null;
  let _auditoriaActivaIdModal   = null;
  let _auditoriaResponderActualId = null;

  // ---------------------------------------------------------------
  // SSO ACCESS REQUESTS — Admin
  // ---------------------------------------------------------------
  async function _updateSsoRequestsBadge() {
    try {
      const res = await fetch("/api/admin/sso-access-requests?estado=pendiente");
      if (!res.ok) return;
      const items = await res.json();
      const badge = $("sso-requests-badge");
      if (!badge) return;
      if (items.length > 0) {
        badge.textContent = items.length;
        badge.classList.remove("hidden");
      } else {
        badge.classList.add("hidden");
      }
    } catch { /* silencioso */ }
  }

  async function loadSsoAccessRequests() {
    const estado    = $("sso-ar-filter-estado")?.value || "";
    const container = $("sso-ar-table-container");
    if (!container) return;
    container.innerHTML = '<p class="notif-empty">Cargando...</p>';

    const url = `/api/admin/sso-access-requests${estado ? "?estado=" + estado : ""}`;
    const res = await fetch(url);
    if (!res.ok) { container.innerHTML = '<p class="notif-empty">Error al cargar solicitudes.</p>'; return; }
    const data = await res.json();

    $("sso-ar-count").textContent = `${data.length} solicitud${data.length !== 1 ? "es" : ""}`;

    if (!data.length) {
      container.innerHTML = '<p class="notif-empty">No hay solicitudes de acceso.</p>';
      _updateSsoRequestsBadge();
      return;
    }

    const table = document.createElement("table");
    table.className = "audit-table";
    table.innerHTML = `<thead><tr>
      <th>Email</th><th>Nombre</th><th>Comentario</th>
      <th>Estado</th><th>Fecha</th><th>Acciones</th>
    </tr></thead>`;
    const tbody = document.createElement("tbody");

    for (const req of data) {
      const tr = document.createElement("tr");
      const badge = req.estado === "pendiente"
        ? '<span class="badge-sso-pendiente">Pendiente</span>'
        : '<span class="badge-sso-visto">Visto</span>';
      tr.innerHTML = `
        <td>${escapeHtml(req.email)}</td>
        <td>${escapeHtml(req.nombre || "—")}</td>
        <td style="max-width:220px;white-space:pre-wrap">${escapeHtml(req.comentario || "—")}</td>
        <td>${badge}</td>
        <td>${req.fecha ? req.fecha.substring(0, 16).replace("T", " ") : "—"}</td>
        <td></td>`;
      const actionsCell = tr.lastElementChild;

      if (req.estado === "pendiente") {
        const btnVisto = document.createElement("button");
        btnVisto.className = "btn-sm btn-primary";
        btnVisto.textContent = "Marcar visto";
        btnVisto.style.marginRight = ".3rem";
        btnVisto.addEventListener("click", async () => {
          await fetch(`/api/admin/sso-access-requests/${req.id}/vista`, { method: "PUT" });
          loadSsoAccessRequests();
        });
        actionsCell.appendChild(btnVisto);
      }

      const btnDel = document.createElement("button");
      btnDel.className = "btn-sm";
      btnDel.style.cssText = "background:#FEE2E2;color:#DC2626;border:none;border-radius:6px;padding:.3rem .7rem;cursor:pointer";
      btnDel.textContent = "Eliminar";
      btnDel.addEventListener("click", async () => {
        if (!confirm("¿Eliminar esta solicitud?")) return;
        await fetch(`/api/admin/sso-access-requests/${req.id}`, { method: "DELETE" });
        loadSsoAccessRequests();
      });
      actionsCell.appendChild(btnDel);
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    container.innerHTML = "";
    container.appendChild(table);
    _updateSsoRequestsBadge();
  }

  // Actualiza el badge del sidebar con el conteo de auditorías activas
  async function _updateAuditoriasBadge() {
    try {
      const res = await fetch("/api/auditoria/activas");
      if (!res.ok) return;
      const items = await res.json();
      const badge = $("auditorias-sidebar-badge");
      if (!badge) return;
      if (items.length > 0) {
        badge.textContent = items.length;
        badge.classList.remove("hidden");
      } else {
        badge.classList.add("hidden");
      }
    } catch (_) {}
  }

  // Badge y sección "Mis Auditorías Pendientes" — para el destinatario (no-ADMIN)
  async function _updateMisAuditoriasBadge() {
    try {
      const res = await fetch("/api/auditoria/mis-pendientes");
      if (!res.ok) return;
      const items = await res.json();
      const navBtn = $("nav-mis-auditorias");
      const badge  = $("mis-auditorias-badge");
      if (!navBtn) return;
      if (items.length > 0) {
        navBtn.classList.remove("hidden");
        if (badge) { badge.textContent = items.length; badge.classList.remove("hidden"); }
      } else {
        navBtn.classList.add("hidden");
        if (badge) badge.classList.add("hidden");
      }
    } catch (_) {}
  }

  async function renderMisAuditoriasSection() {
    const cont  = $("mis-auditorias-list");
    const emp   = $("mis-auditorias-empty");
    const cnt   = $("mis-auditorias-count");
    if (!cont) return;
    cont.innerHTML = '<p class="loading-msg">Cargando&hellip;</p>';
    if (emp) emp.classList.add("hidden");

    try {
      const res = await fetch("/api/auditoria/mis-pendientes");
      if (!res.ok) { cont.innerHTML = ""; return; }
      const items = await res.json();

      if (!items.length) {
        cont.innerHTML = "";
        if (emp) emp.classList.remove("hidden");
        if (cnt) cnt.textContent = "";
        return;
      }

      if (cnt) cnt.textContent = `${items.length} auditoría${items.length !== 1 ? "s" : ""}`;
      cont.innerHTML = "";

      items.forEach(item => {
        const estadoTxt = item.estado === "en_proceso" ? "En proceso" : "Activa";
        const estadoColor = item.estado === "en_proceso" ? "#D97706" : "#DC2626";
        const card = document.createElement("div");
        card.style.cssText = "background:#FFF;border:1px solid #E2E8F0;border-left:4px solid #F59E0B;border-radius:8px;padding:1rem 1.25rem;margin-bottom:.75rem;cursor:pointer;";
        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem">
            <div>
              <p style="font-weight:600;margin:0 0 .2rem;color:#1A202C">${escapeHtml(item.consecutivo || ("ID " + item.registro_id))} — ${escapeHtml(item.nombre_prestador || "")}</p>
              <p style="margin:0 0 .4rem;font-size:.85rem;color:#4A5568">${escapeHtml(item.comentario_admin)}</p>
              <p style="margin:0;font-size:.8rem;color:#718096">Enviada por: <strong>${escapeHtml(item.nombre_admin || item.admin_usuario)}</strong> · ${item.fecha_creacion ? new Date(item.fecha_creacion).toLocaleString("es-CO") : ""}</p>
            </div>
            <span style="font-size:.75rem;font-weight:600;color:${estadoColor};white-space:nowrap;padding:.2rem .5rem;background:${item.estado === "en_proceso" ? "#FEF3C7" : "#FEE2E2"};border-radius:4px">${estadoTxt}</span>
          </div>`;
        card.title = "Clic para abrir el registro y responder la auditoría";
        card.addEventListener("click", async () => {
          try {
            const r = await fetch(`/api/registro/${item.registro_id}`);
            if (r.ok) {
              const data = await r.json();
              openEditForm(item.registro_id, data);
            } else {
              showToast("No se pudo abrir el registro.", "error");
            }
          } catch (_) {
            showToast("Error al abrir el registro.", "error");
          }
        });
        cont.appendChild(card);
      });

      // Actualizar badge después de renderizar
      _updateMisAuditoriasBadge();
    } catch (_) {
      cont.innerHTML = "";
    }
  }

  // Sección "Auditorías activas" — carga y renderiza la lista
  async function loadAuditoriasActivas() {
    const list = $("auditorias-activas-list");
    if (!list) return;
    list.innerHTML = '<p class="notif-empty">Cargando...</p>';
    const res = await fetch("/api/auditoria/activas");
    if (!res.ok) { list.innerHTML = '<p class="notif-empty">Error al cargar auditorías.</p>'; return; }
    const items = await res.json();
    if (!items.length) {
      list.innerHTML = '<p class="notif-empty">No hay auditorías activas en este momento.</p>';
      return;
    }
    list.innerHTML = "";
    for (const item of items) {
      const estadoBadge = item.estado === "en_proceso"
        ? '<span class="sol-badge" style="background:#FEF3C7;color:#92400E;border:1px solid #FCD34D">En proceso</span>'
        : '<span class="sol-badge" style="background:#DBEAFE;color:#1E40AF;border:1px solid #93C5FD">Activa</span>';
      const card = document.createElement("div");
      card.className = "solicitud-card";
      card.innerHTML = `
        <div class="sol-card-header">
          <div class="sol-card-title">
            <strong>${escapeHtml(item.consecutivo || `ID ${item.registro_id}`)}</strong>
            ${item.compania ? `&nbsp;—&nbsp;${escapeHtml(item.compania)}` : ""}
            ${estadoBadge}
          </div>
          <span class="sol-fecha">${item.fecha_creacion ? new Date(item.fecha_creacion).toLocaleString("es-CO") : ""}</span>
        </div>
        <p class="sol-solicitante">Responsable: <strong>${escapeHtml(item.nombre_destinatario || item.destinatario_usuario)}</strong></p>
        <p class="sol-comentario">${escapeHtml(item.comentario_admin)}</p>
        ${item.comentario_respuesta
          ? `<p style="color:#065F46;margin:.25rem 0 0"><strong>Respuesta:</strong> ${escapeHtml(item.comentario_respuesta)}</p>`
          : ""}
      `;
      const btnVer = document.createElement("button");
      btnVer.className = "btn-outline";
      btnVer.textContent = "Ver registro";
      btnVer.style.cssText = "margin-top:.5rem;font-size:.82rem";
      btnVer.addEventListener("click", () => openEditForm(item.registro_id, { consecutivo: item.consecutivo, nombre: "" }));
      card.appendChild(btnVer);

      const btnAud = document.createElement("button");
      btnAud.className = "btn-outline";
      btnAud.textContent = "Ver auditoría";
      btnAud.style.cssText = "margin-top:.5rem;margin-left:.5rem;font-size:.82rem;color:#1D4ED8;border-color:#1D4ED8";
      btnAud.addEventListener("click", () => openAuditoriaModal(item.registro_id, null));
      card.appendChild(btnAud);
      list.appendChild(card);
    }
  }

  // Abre el modal de auditoría: historial + crear nueva (si ADMIN y no hay activa)
  async function openAuditoriaModal(registroId, _meta) {
    _auditoriaModalRegistroId = registroId;
    const overlay      = $("auditoria-registro-overlay");
    const histContainer = $("auditoria-historial-container");
    const nuevaContainer = $("auditoria-nueva-container");
    const btnEnviar    = $("btn-auditoria-enviar");
    if (!overlay) return;

    histContainer.innerHTML = '<p class="notif-empty" style="margin:.5rem 0">Cargando historial...</p>';
    nuevaContainer.innerHTML = "";
    btnEnviar.style.display = "none";
    overlay.classList.remove("hidden");

    const res = await fetch(`/api/auditoria/registro/${registroId}`);
    if (!res.ok) {
      histContainer.innerHTML = '<p class="notif-empty">Error al cargar el historial.</p>';
      return;
    }
    const auditorias = await res.json();

    // Renderizar historial
    if (!auditorias.length) {
      histContainer.innerHTML = '<p class="notif-empty" style="margin:.5rem 0;color:#6B7280">Sin historial de auditorías para este registro.</p>';
    } else {
      histContainer.innerHTML = `<h4 style="margin:0 0 .75rem;color:#374151;font-size:.95rem">Historial de auditor&iacute;as</h4>`;
      for (const aud of auditorias) {
        const ESTADO_STYLE = {
          activa:     { bg: "#DBEAFE", color: "#1E40AF", label: "Activa" },
          en_proceso: { bg: "#FEF3C7", color: "#92400E", label: "En proceso" },
          terminada:  { bg: "#D1FAE5", color: "#065F46", label: "Terminada" },
        }[aud.estado] || { bg: "#F3F4F6", color: "#374151", label: aud.estado };
        const div = document.createElement("div");
        div.style.cssText = `border:1px solid #E5E7EB;border-radius:8px;padding:.75rem;margin-bottom:.75rem`;
        div.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.4rem;gap:.5rem;flex-wrap:wrap">
            <span style="font-size:.8rem;color:#6B7280">${aud.fecha_creacion ? new Date(aud.fecha_creacion).toLocaleString("es-CO") : ""}</span>
            <span style="background:${ESTADO_STYLE.bg};color:${ESTADO_STYLE.color};border-radius:4px;padding:2px 8px;font-size:.78rem;font-weight:600">${ESTADO_STYLE.label}</span>
          </div>
          <p style="margin:0 0 .35rem;font-size:.85rem"><strong>Admin:</strong> ${escapeHtml(aud.nombre_admin || aud.admin_usuario)}</p>
          <p style="margin:0 0 .5rem;color:#374151;font-size:.9rem;background:#F9FAFB;border-radius:6px;padding:.4rem .6rem">${escapeHtml(aud.comentario_admin)}</p>
          ${aud.comentario_respuesta ? `
            <hr style="border:none;border-top:1px solid #E5E7EB;margin:.5rem 0">
            <p style="margin:0 0 .2rem;font-size:.8rem;color:#6B7280">Respuesta de <strong>${escapeHtml(aud.nombre_destinatario || aud.destinatario_usuario)}</strong>${aud.fecha_respuesta ? " — " + new Date(aud.fecha_respuesta).toLocaleString("es-CO") : ""}:</p>
            <p style="margin:0;color:#065F46;font-size:.9rem">${escapeHtml(aud.comentario_respuesta)}</p>
          ` : ""}
        `;
        histContainer.appendChild(div);
      }
    }

    // Sección "crear nueva" (solo ADMIN)
    if (!sessionIsAdmin) {
      nuevaContainer.innerHTML = "";
      btnEnviar.style.display = "none";
      return;
    }

    const tieneActiva = auditorias.some(a => a.estado === "activa" || a.estado === "en_proceso");
    _auditoriaActivaIdModal = tieneActiva
      ? (auditorias.find(a => a.estado === "activa" || a.estado === "en_proceso") || {}).id || null
      : null;

    if (tieneActiva) {
      nuevaContainer.innerHTML = `<p style="color:#92400E;background:#FEF3C7;border:1px solid #FCD34D;border-radius:6px;padding:.5rem .75rem;margin:.75rem 0 0;font-size:.88rem">Ya existe una auditor&iacute;a activa o en proceso. Debe cerrarse antes de crear una nueva.</p>`;
      btnEnviar.style.display = "none";
    } else {
      nuevaContainer.innerHTML = `
        <hr class="modal-section-divider">
        <h4 class="modal-section-title-blue">Nueva auditor&iacute;a</h4>
        <textarea id="auditoria-comentario-input" rows="4" class="modal-textarea"
          placeholder="Describa el hallazgo o corrección solicitada al responsable..."></textarea>
        <p id="auditoria-comentario-error" class="modal-error-msg">El comentario es obligatorio.</p>
      `;
      btnEnviar.style.display = "";
    }
  }

  // Enviar nueva auditoría
  async function _enviarAuditoria() {
    const input  = $("auditoria-comentario-input");
    const errEl  = $("auditoria-comentario-error");
    const comentario = (input?.value || "").trim();
    if (!comentario) {
      if (errEl) { errEl.style.display = "block"; errEl.textContent = "El comentario es obligatorio."; }
      return;
    }
    if (errEl) errEl.style.display = "none";

    const res = await fetch(`/api/auditoria/registro/${_auditoriaModalRegistroId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comentario }),
    });
    if (res.ok) {
      $("auditoria-registro-overlay").classList.add("hidden");
      _updateAuditoriasBadge();
      showToast("Auditoría enviada correctamente.", "success");
    } else {
      const err = await res.json().catch(() => ({}));
      if (errEl) { errEl.style.display = "block"; errEl.textContent = err.detail || "Error al enviar la auditoría."; }
    }
  }

  // Muestra el historial de aprobación N en un panel debajo de las tarjetas
  async function _showNHistorial(registroId) {
    const _accionLabel = {
      solicitud:            "Solicitud Gestor",
      aprobacion_lider:     "Aprobado — Líder",
      rechazo_lider:        "Rechazado — Líder",
      cancelacion_gestor:   "Cancelado — Gestor",
      aprobacion_contralor: "Re-aprobado — Contralor",
    };
    try {
      const res = await fetch(`/api/registro/${registroId}/historial-n`);
      const logs = res.ok ? await res.json() : [];
      // Reutilizar o crear el panel de detalle
      let _panel = $("n-historial-panel");
      if (!_panel) {
        _panel = document.createElement("div");
        _panel.id = "n-historial-panel";
        _panel.style.cssText = "background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:.75rem 1rem;margin-bottom:12px;font-size:.85rem;color:#1e40af;";
        if (formCardsContainer) formCardsContainer.insertAdjacentElement("afterend", _panel);
      }
      if (!logs.length) {
        _panel.innerHTML = "<em>Sin historial de aprobación N registrado.</em>";
        _panel.style.display = "";
        return;
      }
      let _html = `<strong style="display:block;margin-bottom:6px">📋 Historial de aprobación N</strong>
        <table style="width:100%;border-collapse:collapse;font-size:.83rem;">
          <thead><tr style="border-bottom:1px solid #93c5fd;">
            <th style="text-align:left;padding:3px 8px;">Acción</th>
            <th style="text-align:left;padding:3px 8px;">Usuario</th>
            <th style="text-align:left;padding:3px 8px;">Comentario</th>
            <th style="text-align:left;padding:3px 8px;white-space:nowrap;">Fecha</th>
          </tr></thead><tbody>`;
      logs.forEach(l => {
        const _fecha = l.fecha ? l.fecha.slice(0, 16).replace("T", " ") : "";
        _html += `<tr style="border-bottom:1px solid #dbeafe;">
          <td style="padding:3px 8px;">${escapeHtml(_accionLabel[l.accion] || l.accion)}</td>
          <td style="padding:3px 8px;">${escapeHtml(l.usuario)}</td>
          <td style="padding:3px 8px;">${escapeHtml(l.comentario || "—")}</td>
          <td style="padding:3px 8px;white-space:nowrap;">${escapeHtml(_fecha)}</td>
        </tr>`;
      });
      _html += `</tbody></table>`;
      _panel.innerHTML = _html;
      _panel.style.display = "";
    } catch { /* silenciar */ }
  }

  // Carga y muestra la tarjeta de auditoría activa en el formulario (para el destinatario)
  async function _loadAuditoriaEnForm(registroId) {
    // El admin tiene el botón propio; el destinatario ve la tarjeta
    if (sessionIsAdmin) return;
    if (!formCardsContainer) return;

    try {
      const res = await fetch(`/api/auditoria/registro/${registroId}`);
      if (!res.ok) return;
      const auditorias = await res.json();
      const activas = auditorias.filter(
        a => (a.estado === "activa" || a.estado === "en_proceso") && a.destinatario_usuario === sessionUsuario
      );
      if (!activas.length) return;

      activas.forEach(activa => {
        const estadoTxt = activa.estado === "en_proceso" ? " (en proceso)" : "";
        const card = _buildStatusCard({
          variant: "alerta", icon: "shield", count: String(activas.length),
          title: `Auditoría pendiente${estadoTxt}`,
          desc: `${activa.comentario_admin} — Enviada por: ${activa.nombre_admin || activa.admin_usuario}`,
          onAction: () => _openResponderAuditoriaModal(activa.id, activa.comentario_admin, activa.nombre_admin || activa.admin_usuario),
        });
        formCardsContainer.appendChild(card);
      });
    } catch (_) { /* silenciar */ }
  }

  // Abre el modal de respuesta para el destinatario
  function _openResponderAuditoriaModal(auditoriaId, comentarioAdmin, nombreAdmin) {
    _auditoriaResponderActualId = auditoriaId;
    const overlay = $("auditoria-responder-overlay");
    const info    = $("auditoria-responder-info");
    if (!overlay || !info) return;
    info.innerHTML = `
      <p style="margin:0 0 .4rem;font-size:.88rem"><strong>Auditor&iacute;a enviada por:</strong> ${escapeHtml(nombreAdmin)}</p>
      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;padding:.5rem .75rem;color:#1E40AF;font-size:.9rem;margin-bottom:.25rem">${escapeHtml(comentarioAdmin)}</div>
    `;
    $("auditoria-responder-comentario").value = "";
    overlay.classList.remove("hidden");
  }

  // Envía la respuesta del destinatario
  async function _responderAuditoria(estado) {
    const comentario = ($("auditoria-responder-comentario")?.value || "").trim();
    const res = await fetch(`/api/auditoria/${_auditoriaResponderActualId}/responder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado, comentario }),
    });
    if (res.ok) {
      $("auditoria-responder-overlay").classList.add("hidden");
      // Recargar banner en el formulario si sigue abierto
      if (currentEditId) _loadAuditoriaEnForm(currentEditId);
      showToast(estado === "terminada" ? "Auditoría marcada como Terminada." : "Estado actualizado a En proceso.", "success");
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.detail || "Error al responder la auditoría.", "error");
    }
  }

  // Eventos de los modales de auditoría
  $("auditoria-modal-close")?.addEventListener("click", () => $("auditoria-registro-overlay").classList.add("hidden"));
  $("btn-auditoria-cancelar")?.addEventListener("click", () => $("auditoria-registro-overlay").classList.add("hidden"));
  $("btn-auditoria-enviar")?.addEventListener("click", _enviarAuditoria);
  $("auditoria-responder-close")?.addEventListener("click", () => $("auditoria-responder-overlay").classList.add("hidden"));
  $("btn-auditoria-responder-cancelar")?.addEventListener("click", () => $("auditoria-responder-overlay").classList.add("hidden"));
  $("btn-auditoria-en-proceso")?.addEventListener("click", () => _responderAuditoria("en_proceso"));
  $("btn-auditoria-terminado")?.addEventListener("click", () => _responderAuditoria("terminada"));

  // ---------------------------------------------------------------
  // INIT
  // ---------------------------------------------------------------
  _handleMicrosoftCallback();   // procesar si venimos de redirect de Microsoft
  _loadMicrosoftAuthConfig();   // mostrar/ocultar botón Microsoft en login
  checkSession();
});
  
