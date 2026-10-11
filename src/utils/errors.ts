import { logError } from './logger';
import { showToast } from '@/components/ui/Toast';
import { haptic } from './feedback';

interface ReportErrorOptions {
  context: string;
  userMessage: string;
  retry?: () => void;
}

export function reportError(error: unknown, opts: ReportErrorOptions): void {
  logError(opts.context, error);
  haptic.error();
  showToast(opts.userMessage, {
    type: 'error',
    action: opts.retry ? { label: 'Retry', onPress: opts.retry } : undefined,
  });
}
