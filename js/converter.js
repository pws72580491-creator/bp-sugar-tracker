/* =========================================================
   converter.js — unit conversion helpers
   Glucose: mg/dL <-> mmol/L
   Blood pressure: mmHg <-> kPa
   ========================================================= */

const Converter = (() => {
  const MGDL_PER_MMOL = 18.0182;
  const KPA_PER_MMHG = 0.133322;

  function mgdlToMmol(mgdl) {
    return mgdl / MGDL_PER_MMOL;
  }
  function mmolToMgdl(mmol) {
    return mmol * MGDL_PER_MMOL;
  }
  function mmHgToKpa(mmHg) {
    return mmHg * KPA_PER_MMHG;
  }
  function kpaToMmHg(kpa) {
    return kpa / KPA_PER_MMHG;
  }

  function round(n, digits) {
    const f = Math.pow(10, digits);
    return Math.round(n * f) / f;
  }

  return { mgdlToMmol, mmolToMgdl, mmHgToKpa, kpaToMmHg, round };
})();
