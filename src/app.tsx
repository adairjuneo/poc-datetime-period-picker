import { useState } from 'react';
import 'moment/locale/pt-br';
import { DateTimePeriodPicker } from './components/datetime-period-picker';
import type { DatePeriod } from './components/datetime-period-picker';

export function App() {
  const [datePeriod, setDatePeriod] = useState<DatePeriod>({
    initial: '',
    final: '',
  });

  const [dateTimePeriod, setDateTimePeriod] = useState<DatePeriod>({
    initial: '',
    final: '',
  });

  return (
    <main>
      <h2>DateTime Period Picker</h2>

      <div className="components">
        <section>
          <h3>Variante: date</h3>
          <DateTimePeriodPicker
            name="datePeriod"
            variant="date"
            value={datePeriod}
            onChange={(e) => setDatePeriod(e.target.value)}
          />
          <pre>{JSON.stringify(datePeriod, null, 2)}</pre>
        </section>

        <section>
          <h3>Variante: datetime</h3>
          <DateTimePeriodPicker
            name="dateTimePeriod"
            variant="datetime"
            value={dateTimePeriod}
            onChange={(e) => setDateTimePeriod(e.target.value)}
          />
          <pre>{JSON.stringify(dateTimePeriod, null, 2)}</pre>
        </section>
      </div>
    </main>
  );
}
