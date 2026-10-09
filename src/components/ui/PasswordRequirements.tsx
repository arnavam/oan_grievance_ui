import { PASSWORD_RULES } from '@/lib/validation/password';

interface PasswordRequirementsProps {
  password?: string;
}

export function PasswordRequirements({ password = '' }: PasswordRequirementsProps) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.label}
            className={`text-xs font-medium ${met ? 'text-[#16A34A]' : 'text-gray-400'}`}
          >
            {met ? '✓' : '•'} {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
