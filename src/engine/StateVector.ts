/**
 * StateVector - The core data structure representing a human life state
 * 
 * Dimensions with REAL UNITS:
 * - Wl: Liquid Wealth (USD: -$100K to $10M)
 * - We: Equity/Potential (USD: $0 to $50M)
 * - V:  Vitality (broken into Body, Mind, Appearance subsections)
 * - I:  Intelligence (normalized 0-1 with adjective labels)
 * - S:  Status (normalized 0-1 with adjective labels)
 * - R:  Resilience (normalized 0-1 with adjective labels)
 */

// ============================================================================
// VITALITY BREAKDOWN
// ============================================================================

export interface VitalityBreakdown {
  body: number;       // 0-1: Physical fitness
  mind: number;       // 0-1: Mental state/stress
  appearance: number; // 0-1: Physical appearance
}

export type BodyAdjective = 'Frail' | 'Weak' | 'Average' | 'Fit' | 'Athletic' | 'Peak';
export type MindAdjective = 'Burned Out' | 'Stressed' | 'Coping' | 'Calm' | 'Sharp' | 'Zen';
export type AppearanceAdjective = 'Neglected' | 'Plain' | 'Presentable' | 'Attractive' | 'Stunning';

export const BODY_ADJECTIVES: { threshold: number; label: BodyAdjective }[] = [
  { threshold: 0.15, label: 'Frail' },
  { threshold: 0.30, label: 'Weak' },
  { threshold: 0.50, label: 'Average' },
  { threshold: 0.70, label: 'Fit' },
  { threshold: 0.85, label: 'Athletic' },
  { threshold: 1.01, label: 'Peak' },
];

export const MIND_ADJECTIVES: { threshold: number; label: MindAdjective }[] = [
  { threshold: 0.15, label: 'Burned Out' },
  { threshold: 0.30, label: 'Stressed' },
  { threshold: 0.50, label: 'Coping' },
  { threshold: 0.70, label: 'Calm' },
  { threshold: 0.85, label: 'Sharp' },
  { threshold: 1.01, label: 'Zen' },
];

export const APPEARANCE_ADJECTIVES: { threshold: number; label: AppearanceAdjective }[] = [
  { threshold: 0.20, label: 'Neglected' },
  { threshold: 0.40, label: 'Plain' },
  { threshold: 0.60, label: 'Presentable' },
  { threshold: 0.80, label: 'Attractive' },
  { threshold: 1.01, label: 'Stunning' },
];

export function getBodyAdjective(value: number): BodyAdjective {
  for (const { threshold, label } of BODY_ADJECTIVES) {
    if (value < threshold) return label;
  }
  return 'Peak';
}

export function getMindAdjective(value: number): MindAdjective {
  for (const { threshold, label } of MIND_ADJECTIVES) {
    if (value < threshold) return label;
  }
  return 'Zen';
}

export function getAppearanceAdjective(value: number): AppearanceAdjective {
  for (const { threshold, label } of APPEARANCE_ADJECTIVES) {
    if (value < threshold) return label;
  }
  return 'Stunning';
}

// ============================================================================
// INTELLIGENCE, STATUS, RESILIENCE ADJECTIVES
// ============================================================================

export type IntelligenceAdjective = 'Struggling' | 'Below Average' | 'Average' | 'Smart' | 'Brilliant' | 'Genius';
export type StatusAdjective = 'Unknown' | 'Obscure' | 'Known' | 'Respected' | 'Influential' | 'Elite';
export type ResilienceAdjective = 'Broken' | 'Fragile' | 'Vulnerable' | 'Stable' | 'Resilient' | 'Unshakeable';

export const INTELLIGENCE_ADJECTIVES: { threshold: number; label: IntelligenceAdjective }[] = [
  { threshold: 0.15, label: 'Struggling' },
  { threshold: 0.30, label: 'Below Average' },
  { threshold: 0.50, label: 'Average' },
  { threshold: 0.70, label: 'Smart' },
  { threshold: 0.85, label: 'Brilliant' },
  { threshold: 1.01, label: 'Genius' },
];

export const STATUS_ADJECTIVES: { threshold: number; label: StatusAdjective }[] = [
  { threshold: 0.15, label: 'Unknown' },
  { threshold: 0.30, label: 'Obscure' },
  { threshold: 0.50, label: 'Known' },
  { threshold: 0.70, label: 'Respected' },
  { threshold: 0.85, label: 'Influential' },
  { threshold: 1.01, label: 'Elite' },
];

export const RESILIENCE_ADJECTIVES: { threshold: number; label: ResilienceAdjective }[] = [
  { threshold: 0.15, label: 'Broken' },
  { threshold: 0.30, label: 'Fragile' },
  { threshold: 0.50, label: 'Vulnerable' },
  { threshold: 0.70, label: 'Stable' },
  { threshold: 0.85, label: 'Resilient' },
  { threshold: 1.01, label: 'Unshakeable' },
];

export function getIntelligenceAdjective(value: number): IntelligenceAdjective {
  for (const { threshold, label } of INTELLIGENCE_ADJECTIVES) {
    if (value < threshold) return label;
  }
  return 'Genius';
}

export function getStatusAdjective(value: number): StatusAdjective {
  for (const { threshold, label } of STATUS_ADJECTIVES) {
    if (value < threshold) return label;
  }
  return 'Elite';
}

export function getResilienceAdjective(value: number): ResilienceAdjective {
  for (const { threshold, label } of RESILIENCE_ADJECTIVES) {
    if (value < threshold) return label;
  }
  return 'Unshakeable';
}

// ============================================================================
// WEALTH CONVERSION (Normalized <-> Real USD)
// ============================================================================

// Wealth ranges for founder trajectory
export const WEALTH_CONFIG = {
  liquid: {
    min: -100_000,    // -$100K (debt)
    max: 10_000_000,  // $10M
  },
  equity: {
    min: 0,
    max: 50_000_000,  // $50M
  },
};

/**
 * Convert normalized liquid wealth (0-1) to real USD
 * Uses exponential scale: 0 → -$100K, 0.5 → ~$500K, 1 → $10M
 */
export function normalizedToLiquidUSD(normalized: number): number {
  const clamped = Math.max(0, Math.min(1, normalized));
  
  // Use a shifted exponential to handle negative values
  // At 0: -$100K, at ~0.1: $0, at 0.5: ~$500K, at 1: $10M
  if (clamped < 0.1) {
    // Linear interpolation from -$100K to $0
    return WEALTH_CONFIG.liquid.min + (clamped / 0.1) * Math.abs(WEALTH_CONFIG.liquid.min);
  }
  
  // Exponential growth from $0 to $10M
  const adjustedNorm = (clamped - 0.1) / 0.9; // 0 to 1
  const expValue = Math.pow(adjustedNorm, 2.5); // Exponential curve
  return expValue * WEALTH_CONFIG.liquid.max;
}

/**
 * Convert real USD to normalized liquid wealth (0-1)
 */
export function liquidUSDToNormalized(usd: number): number {
  if (usd < 0) {
    // Linear from -$100K to $0 maps to 0 to 0.1
    const ratio = (usd - WEALTH_CONFIG.liquid.min) / Math.abs(WEALTH_CONFIG.liquid.min);
    return Math.max(0, ratio * 0.1);
  }
  
  // Inverse exponential from $0 to $10M maps to 0.1 to 1
  const ratio = usd / WEALTH_CONFIG.liquid.max;
  const adjustedNorm = Math.pow(ratio, 1 / 2.5);
  return 0.1 + adjustedNorm * 0.9;
}

/**
 * Convert normalized equity (0-1) to real USD
 */
export function normalizedToEquityUSD(normalized: number): number {
  const clamped = Math.max(0, Math.min(1, normalized));
  // Exponential scale for equity
  const expValue = Math.pow(clamped, 3); // Steeper curve for equity
  return expValue * WEALTH_CONFIG.equity.max;
}

/**
 * Convert real USD equity to normalized (0-1)
 */
export function equityUSDToNormalized(usd: number): number {
  const ratio = Math.max(0, usd) / WEALTH_CONFIG.equity.max;
  return Math.pow(ratio, 1 / 3);
}

/**
 * Format USD for display
 * @param amount - The amount in USD
 * @param compact - If true, use shorter format (e.g., $150K instead of $150,000)
 */
export function formatUSD(amount: number, compact: boolean = true): string {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  
  if (compact) {
    if (absAmount >= 1_000_000) {
      return `${sign}$${(absAmount / 1_000_000).toFixed(1)}M`;
    } else if (absAmount >= 1_000) {
      return `${sign}$${(absAmount / 1_000).toFixed(0)}K`;
    } else {
      return `${sign}$${absAmount.toFixed(0)}`;
    }
  } else {
    return `${sign}$${absAmount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
}

/**
 * Get total net worth from normalized values
 */
export function getNetWorth(wl: number, we: number): number {
  return normalizedToLiquidUSD(wl) + normalizedToEquityUSD(we);
}

// ============================================================================
// NET WORTH TIERS (for Sankey categorization)
// ============================================================================

export type WealthTier = 'debt' | 'struggling' | 'comfortable' | 'wealthy' | 'rich';

export const WEALTH_TIERS: { tier: WealthTier; maxNetWorth: number; label: string; color: string }[] = [
  { tier: 'debt', maxNetWorth: 0, label: 'In Debt', color: '#ef4444' },
  { tier: 'struggling', maxNetWorth: 100_000, label: 'Struggling', color: '#f97316' },
  { tier: 'comfortable', maxNetWorth: 1_000_000, label: 'Comfortable', color: '#22c55e' },
  { tier: 'wealthy', maxNetWorth: 10_000_000, label: 'Wealthy', color: '#3b82f6' },
  { tier: 'rich', maxNetWorth: Infinity, label: 'Rich', color: '#fbbf24' },
];

export function getWealthTier(netWorth: number): WealthTier {
  for (const { tier, maxNetWorth } of WEALTH_TIERS) {
    if (netWorth < maxNetWorth) return tier;
  }
  return 'rich';
}

export function getWealthTierInfo(netWorth: number) {
  const tier = getWealthTier(netWorth);
  return WEALTH_TIERS.find(t => t.tier === tier)!;
}

// ============================================================================
// STATE VECTOR DATA INTERFACES
// ============================================================================

export interface StateVectorData {
  Wl: number;  // Liquid Wealth [0, 1] - maps to USD
  We: number;  // Equity/Potential [0, 1] - maps to USD
  V: number;   // Vitality [0, 1] - average of body/mind/appearance
  I: number;   // Intelligence [0, 1]
  S: number;   // Status [0, 1]
  R: number;   // Resilience [0, 1]
}

export interface ExtendedStateData extends StateVectorData {
  vitality: VitalityBreakdown;
}

export interface TimestampedState extends StateVectorData {
  timestamp: number;  // Time tick (0 = now, in years)
  vitality?: VitalityBreakdown;
}

export interface RealUnitsState {
  liquidWealth: number;      // USD
  equity: number;            // USD
  netWorth: number;          // USD (liquid + equity)
  wealthTier: WealthTier;
  body: number;              // 0-1
  bodyLabel: BodyAdjective;
  mind: number;              // 0-1
  mindLabel: MindAdjective;
  appearance: number;        // 0-1
  appearanceLabel: AppearanceAdjective;
  intelligence: number;      // 0-1
  intelligenceLabel: IntelligenceAdjective;
  status: number;            // 0-1
  statusLabel: StatusAdjective;
  resilience: number;        // 0-1
  resilienceLabel: ResilienceAdjective;
}

export const STATE_DIMENSIONS = ['Wl', 'We', 'V', 'I', 'S', 'R'] as const;
export type StateDimension = typeof STATE_DIMENSIONS[number];

// ============================================================================
// STATE VECTOR CLASS
// ============================================================================

export class StateVector implements StateVectorData {
  Wl: number;
  We: number;
  V: number;
  I: number;
  S: number;
  R: number;
  
  // Vitality breakdown (optional, computed from V if not provided)
  private _vitality: VitalityBreakdown;

  constructor(data: Partial<StateVectorData> & { vitality?: VitalityBreakdown } = {}) {
    this.Wl = this.clamp(data.Wl ?? 0.5);
    this.We = this.clamp(data.We ?? 0.5);
    this.V = this.clamp(data.V ?? 0.5);
    this.I = this.clamp(data.I ?? 0.5);
    this.S = this.clamp(data.S ?? 0.5);
    this.R = this.clamp(data.R ?? 0.5);
    
    // Initialize vitality breakdown
    if (data.vitality) {
      this._vitality = {
        body: this.clamp(data.vitality.body),
        mind: this.clamp(data.vitality.mind),
        appearance: this.clamp(data.vitality.appearance),
      };
    } else {
      // Default: distribute V evenly with some variance
      this._vitality = {
        body: this.clamp(this.V + (Math.random() - 0.5) * 0.1),
        mind: this.clamp(this.V + (Math.random() - 0.5) * 0.1),
        appearance: this.clamp(this.V + (Math.random() - 0.5) * 0.1),
      };
    }
  }

  private clamp(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  /**
   * Get vitality breakdown
   */
  get vitality(): VitalityBreakdown {
    return { ...this._vitality };
  }

  /**
   * Set vitality breakdown and update V
   */
  setVitality(vitality: Partial<VitalityBreakdown>): void {
    if (vitality.body !== undefined) this._vitality.body = this.clamp(vitality.body);
    if (vitality.mind !== undefined) this._vitality.mind = this.clamp(vitality.mind);
    if (vitality.appearance !== undefined) this._vitality.appearance = this.clamp(vitality.appearance);
    
    // Update V as average
    this.V = (this._vitality.body + this._vitality.mind + this._vitality.appearance) / 3;
  }

  /**
   * Get state with real units (USD, adjectives)
   */
  toRealUnits(): RealUnitsState {
    const liquidWealth = normalizedToLiquidUSD(this.Wl);
    const equity = normalizedToEquityUSD(this.We);
    const netWorth = liquidWealth + equity;
    
    return {
      liquidWealth,
      equity,
      netWorth,
      wealthTier: getWealthTier(netWorth),
      body: this._vitality.body,
      bodyLabel: getBodyAdjective(this._vitality.body),
      mind: this._vitality.mind,
      mindLabel: getMindAdjective(this._vitality.mind),
      appearance: this._vitality.appearance,
      appearanceLabel: getAppearanceAdjective(this._vitality.appearance),
      intelligence: this.I,
      intelligenceLabel: getIntelligenceAdjective(this.I),
      status: this.S,
      statusLabel: getStatusAdjective(this.S),
      resilience: this.R,
      resilienceLabel: getResilienceAdjective(this.R),
    };
  }

  /**
   * Get the state as a plain object
   */
  toData(): StateVectorData {
    return {
      Wl: this.Wl,
      We: this.We,
      V: this.V,
      I: this.I,
      S: this.S,
      R: this.R,
    };
  }

  /**
   * Get extended data including vitality breakdown
   */
  toExtendedData(): ExtendedStateData {
    return {
      ...this.toData(),
      vitality: this.vitality,
    };
  }

  /**
   * Get the state as an array [Wl, We, V, I, S, R]
   */
  toArray(): number[] {
    return [this.Wl, this.We, this.V, this.I, this.S, this.R];
  }

  /**
   * Create a StateVector from an array
   */
  static fromArray(arr: number[]): StateVector {
    return new StateVector({
      Wl: arr[0],
      We: arr[1],
      V: arr[2],
      I: arr[3],
      S: arr[4],
      R: arr[5],
    });
  }

  /**
   * Create from real USD values
   */
  static fromRealUnits(data: {
    liquidWealth: number;
    equity: number;
    vitality: VitalityBreakdown;
    intelligence: number;
    status: number;
    resilience: number;
  }): StateVector {
    const v = (data.vitality.body + data.vitality.mind + data.vitality.appearance) / 3;
    return new StateVector({
      Wl: liquidUSDToNormalized(data.liquidWealth),
      We: equityUSDToNormalized(data.equity),
      V: v,
      I: data.intelligence,
      S: data.status,
      R: data.resilience,
      vitality: data.vitality,
    });
  }

  /**
   * Calculate Euclidean distance to another state
   */
  distanceTo(other: StateVectorData): number {
    const dWl = this.Wl - other.Wl;
    const dWe = this.We - other.We;
    const dV = this.V - other.V;
    const dI = this.I - other.I;
    const dS = this.S - other.S;
    const dR = this.R - other.R;
    return Math.sqrt(dWl * dWl + dWe * dWe + dV * dV + dI * dI + dS * dS + dR * dR);
  }

  /**
   * Linear interpolation between two states
   */
  static lerp(a: StateVectorData, b: StateVectorData, t: number): StateVector {
    const clampedT = Math.max(0, Math.min(1, t));
    return new StateVector({
      Wl: a.Wl + (b.Wl - a.Wl) * clampedT,
      We: a.We + (b.We - a.We) * clampedT,
      V: a.V + (b.V - a.V) * clampedT,
      I: a.I + (b.I - a.I) * clampedT,
      S: a.S + (b.S - a.S) * clampedT,
      R: a.R + (b.R - a.R) * clampedT,
    });
  }

  /**
   * Apply a delta (change) to the state
   */
  applyDelta(delta: Partial<StateVectorData> & { vitality?: Partial<VitalityBreakdown> }): StateVector {
    const newState = new StateVector({
      Wl: this.Wl + (delta.Wl ?? 0),
      We: this.We + (delta.We ?? 0),
      V: this.V + (delta.V ?? 0),
      I: this.I + (delta.I ?? 0),
      S: this.S + (delta.S ?? 0),
      R: this.R + (delta.R ?? 0),
      vitality: {
        body: this._vitality.body + (delta.vitality?.body ?? delta.V ?? 0),
        mind: this._vitality.mind + (delta.vitality?.mind ?? delta.V ?? 0),
        appearance: this._vitality.appearance + (delta.vitality?.appearance ?? delta.V ?? 0),
      },
    });
    return newState;
  }

  /**
   * Clone the state vector
   */
  clone(): StateVector {
    return new StateVector({
      ...this.toData(),
      vitality: this.vitality,
    });
  }

  /**
   * Calculate the "magnitude" of the state (overall life quality metric)
   */
  magnitude(): number {
    return Math.sqrt(
      this.Wl * this.Wl +
      this.We * this.We +
      this.V * this.V +
      this.I * this.I +
      this.S * this.S +
      this.R * this.R
    ) / Math.sqrt(6); // Normalize to [0, 1]
  }

  /**
   * Calculate risk score (inverse of resilience-weighted stability)
   */
  riskScore(): number {
    // High variance dimensions with low resilience = high risk
    const volatility = this.We; // Equity is most volatile
    const buffer = this.R;
    return volatility * (1 - buffer);
  }

  /**
   * Get net worth in USD
   */
  getNetWorth(): number {
    return getNetWorth(this.Wl, this.We);
  }
}

// ============================================================================
// PRESET STATES (with realistic USD values)
// ============================================================================

export const PRESET_STATES = {
  // Founder: Low cash, some equity, good health, high intelligence
  founder: new StateVector({
    Wl: 0.08,  // ~-$20K (bootstrapping, some debt)
    We: 0.35,  // ~$2M equity potential
    V: 0.7,    // Good health
    I: 0.8,    // High intelligence
    S: 0.4,    // Building network
    R: 0.9,    // Fresh, high resilience
    vitality: { body: 0.65, mind: 0.75, appearance: 0.7 },
  }),
  
  // Student: Limited funds, no equity, peak health
  student: new StateVector({
    Wl: 0.05,  // ~-$50K (student loans)
    We: 0.05,  // Minimal equity
    V: 0.8,    // Young and healthy
    I: 0.6,    // Learning
    S: 0.3,    // Small network
    R: 0.95,   // High resilience
    vitality: { body: 0.85, mind: 0.7, appearance: 0.85 },
  }),
  
  // Professional: Stable income, some savings
  professional: new StateVector({
    Wl: 0.35,  // ~$200K liquid
    We: 0.25,  // ~$500K in 401k/stocks
    V: 0.6,    // Average health
    I: 0.7,    // Skilled
    S: 0.5,    // Decent network
    R: 0.6,    // Some burnout
    vitality: { body: 0.55, mind: 0.55, appearance: 0.7 },
  }),
  
  // Homeless: Negative wealth, poor health
  homeless: new StateVector({
    Wl: 0.02,  // ~-$80K debt
    We: 0.0,   // No equity
    V: 0.25,   // Poor health
    I: 0.4,    // Cognitive decline
    S: 0.1,    // Isolated
    R: 0.2,    // Very low resilience
    vitality: { body: 0.2, mind: 0.15, appearance: 0.4 },
  }),
  
  // Rich: High wealth, comfortable life
  rich: new StateVector({
    Wl: 0.75,  // ~$3M liquid
    We: 0.7,   // ~$15M equity
    V: 0.7,    // Good health (can afford it)
    I: 0.75,   // Smart
    S: 0.8,    // Well connected
    R: 0.7,    // Stable
    vitality: { body: 0.65, mind: 0.7, appearance: 0.75 },
  }),
};
