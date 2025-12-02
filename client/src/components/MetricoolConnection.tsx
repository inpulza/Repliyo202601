import React from 'react';
import { BrandImportWizard } from './BrandImportWizard';

interface MetricoolConnectionProps {
  onClose: () => void;
}

export function MetricoolConnection({ onClose }: MetricoolConnectionProps) {
  return (
    <BrandImportWizard 
      onComplete={onClose}
      onCancel={onClose}
      autoFetch={true}
    />
  );
}
