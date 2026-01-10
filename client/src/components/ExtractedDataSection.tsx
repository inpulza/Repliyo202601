import { Sparkles } from 'lucide-react';

interface ExtractedDataSectionProps {
  customFields: Record<string, any> | null | undefined;
  showHeader?: boolean;
  className?: string;
}

const HIDDEN_FIELDS = ['lastEnrichedAt', 'enrichmentSource', 'lastEnrichmentAt', 'budgetCurrency'];

export function hasDisplayableFields(customFields: Record<string, any> | null | undefined): boolean {
  if (!customFields) return false;
  return Object.keys(customFields).some(key => 
    !key.startsWith('_') && !HIDDEN_FIELDS.includes(key)
  );
}

const FIELD_LABELS: Record<string, string> = {
  intent: 'Intención',
  serviceInterest: 'Servicio de interés',
  qualifiers: 'Observaciones',
  budget: 'Presupuesto',
  budgetAmount: 'Presupuesto',
  budgetCurrency: 'Moneda',
};

const FIELD_ORDER = ['intent', 'serviceInterest', 'budget', 'qualifiers'];

function formatValue(key: string, value: any, customFields: Record<string, any>): string {
  if (key === 'budgetAmount' && value) {
    const currency = customFields.budgetCurrency || 'USD';
    return `${currency} ${value}`;
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return String(value);
}

export function ExtractedDataSection({ 
  customFields, 
  showHeader = true,
  className = ''
}: ExtractedDataSectionProps) {
  if (!customFields) return null;

  const displayableFields = Object.entries(customFields)
    .filter(([key]) => !key.startsWith('_') && !HIDDEN_FIELDS.includes(key))
    .sort((a, b) => {
      const aIndex = FIELD_ORDER.indexOf(a[0]);
      const bIndex = FIELD_ORDER.indexOf(b[0]);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

  if (displayableFields.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`} data-testid="section-extracted-data">
      {showHeader && (
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="h-3 w-3 text-amber-500" />
          Datos Extraídos
        </h4>
      )}
      <div className="bg-gray-50 rounded-lg p-3 space-y-3">
        {displayableFields.map(([key, value]) => (
          <div key={key} className="space-y-0.5">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">
              {FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </p>
            <p className="text-xs text-gray-700 break-words">
              {formatValue(key, value, customFields)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
