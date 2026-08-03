/* =========================================================
   insights.js — guideline-based categorization & tips
   Categories follow commonly published general guidelines
   (American Heart Association style BP ranges; American
   Diabetes Association style glucose ranges). These are
   general reference ranges only, not a medical diagnosis —
   the UI always pairs them with a reminder to consult a
   doctor for interpretation of personal results.
   ========================================================= */

const Insights = (() => {

  // ---- Blood pressure categorization ----
  function categorizeBp(systolic, diastolic) {
    if (systolic >= 180 || diastolic >= 120) {
      return { key: 'crisis', label: '위기 수준 (즉시 진료 필요)', level: 'danger' };
    }
    if (systolic >= 140 || diastolic >= 90) {
      return { key: 'stage2', label: '고혈압 2단계 범위', level: 'danger' };
    }
    if (systolic >= 130 || diastolic >= 80) {
      return { key: 'stage1', label: '고혈압 1단계 범위', level: 'warn' };
    }
    if (systolic >= 120 && diastolic < 80) {
      return { key: 'elevated', label: '상승 범위', level: 'warn' };
    }
    if (systolic < 120 && diastolic < 80) {
      return { key: 'normal', label: '정상 범위', level: 'good' };
    }
    return { key: 'unknown', label: '범위 확인 필요', level: 'info' };
  }

  // ---- Glucose categorization (general reference, context-dependent) ----
  function categorizeGlucose(mgdl, context) {
    const fastingLike = context === 'fasting' || context === 'bedtime';
    if (fastingLike) {
      if (mgdl < 70) return { key: 'low', label: '저혈당 주의', level: 'danger' };
      if (mgdl < 100) return { key: 'normal', label: '정상 범위 (공복 기준)', level: 'good' };
      if (mgdl < 126) return { key: 'pre', label: '공복 혈당 장애 범위', level: 'warn' };
      return { key: 'high', label: '높은 범위 (공복 기준)', level: 'danger' };
    }
    // after meal / random
    if (mgdl < 70) return { key: 'low', label: '저혈당 주의', level: 'danger' };
    if (mgdl < 140) return { key: 'normal', label: '정상 범위 (식후 기준)', level: 'good' };
    if (mgdl < 200) return { key: 'pre', label: '내당능 장애 범위', level: 'warn' };
    return { key: 'high', label: '높은 범위 (식후 기준)', level: 'danger' };
  }

  const BP_TIPS = {
    crisis: '수축기 180 이상 또는 이완기 120 이상은 위급 상황일 수 있습니다. 즉시 병원이나 응급실에 연락하세요.',
    stage2: '지속적으로 이 범위가 나온다면 가까운 시일 내 의료진과 상담을 권장합니다. 나트륨 섭취를 줄이고 처방된 약을 규칙적으로 복용하세요.',
    stage1: '생활 습관 개선(저염식, 규칙적인 운동, 금연)이 도움이 될 수 있는 범위입니다. 다음 진료 시 추세를 공유해 보세요.',
    elevated: '수축기 혈압이 조금 높은 편입니다. 카페인·나트륨 섭취를 점검하고, 측정 전 5분간 안정을 취한 뒤 재측정해 보세요.',
    normal: '건강한 범위를 유지하고 계십니다. 현재의 생활 습관을 잘 이어가세요.',
    unknown: '값을 다시 확인해 주세요.'
  };

  const GLUCOSE_TIPS = {
    low: '저혈당 증상(어지러움, 식은땀, 떨림)이 있다면 빠르게 흡수되는 탄수화물을 섭취하고 증상이 지속되면 의료진과 상담하세요.',
    normal: '측정하신 시점 기준으로 정상 범위입니다. 규칙적인 측정 습관을 유지해 보세요.',
    pre: '경계 범위입니다. 식이섬유 섭취를 늘리고 식후 가벼운 걷기가 도움이 될 수 있습니다. 반복된다면 의료진과 상담해 보세요.',
    high: '반복적으로 높은 수치가 나온다면 의료진과 상담하여 원인을 확인하시길 권장합니다.'
  };

  function bpTip(key) { return BP_TIPS[key] || ''; }
  function glucoseTip(key) { return GLUCOSE_TIPS[key] || ''; }

  // ---- Aggregate stats ----
  function stats(values) {
    if (!values.length) return null;
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      max: Math.max(...values),
      min: Math.min(...values),
      avg: sum / values.length
    };
  }

  // ---- Personalized summary based on recent trend ----
  function trendSummary(bpReadings, glucoseReadings) {
    const notes = [];
    if (bpReadings.length >= 3) {
      const recent = bpReadings.slice(0, 5);
      const highCount = recent.filter(r => categorizeBp(r.systolic, r.diastolic).level !== 'good').length;
      if (highCount >= Math.ceil(recent.length * 0.6)) {
        notes.push({
          level: 'warn',
          text: `최근 혈압 기록 ${recent.length}건 중 ${highCount}건이 정상 범위를 벗어났습니다. 측정 시간대를 일정하게 맞추고, 다음 진료 때 이 추세를 공유해 보세요.`
        });
      } else {
        notes.push({ level: 'good', text: '최근 혈압 기록이 대체로 안정적인 범위에 있습니다.' });
      }
    }
    if (glucoseReadings.length >= 3) {
      const recent = glucoseReadings.slice(0, 5);
      const highCount = recent.filter(r => {
        const mgdl = r.unit === 'mmol' ? Converter.mmolToMgdl(r.value) : r.value;
        return categorizeGlucose(mgdl, r.context).level !== 'good';
      }).length;
      if (highCount >= Math.ceil(recent.length * 0.6)) {
        notes.push({
          level: 'warn',
          text: `최근 혈당 기록 ${recent.length}건 중 ${highCount}건이 참고 범위를 벗어났습니다. 식사 구성과 측정 시점을 함께 기록해 두면 상담 시 도움이 됩니다.`
        });
      } else {
        notes.push({ level: 'good', text: '최근 혈당 기록이 대체로 참고 범위 안에 있습니다.' });
      }
    }
    if (!notes.length) {
      notes.push({ level: 'info', text: '기록이 쌓이면 이곳에 맞춤 인사이트가 표시됩니다. 먼저 오늘의 수치를 기록해 보세요.' });
    }
    return notes;
  }

  return { categorizeBp, categorizeGlucose, bpTip, glucoseTip, stats, trendSummary };
})();
