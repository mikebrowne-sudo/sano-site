import { cleanPayee, payeeTokens, matchClientsForPayee } from '@/lib/payee-match'

const CLIENTS = [
  'Barfoot & Thompson - Onehunga',
  'Barfoot & Thompson - Remuera',
  'Barfoot & Thompson - Ellerslie',
  'Wolfbrook Property',
  'Wendell Property',
  'E Work',
  'Pukekohe Golf Club',
]

describe('cleanPayee', () => {
  it('strips bank transaction-type prefixes', () => {
    expect(cleanPayee('D/C FROM BIRCHALL,TOBI')).toBe('birchall,tobi')
    expect(cleanPayee('D/C FROM From DESIGN WORKS MA')).toBe('design works ma')
    expect(cleanPayee('TFR IN WOLFBROOK PROPERTY M')).toBe('wolfbrook property m')
  })
})

describe('payeeTokens', () => {
  it('expands B&T and drops stopwords + short tokens', () => {
    expect(payeeTokens('B&T Onehunga')).toEqual(['barfoot', 'onehunga'])
    expect(payeeTokens('WOLFBROOK PROPERTY M')).toEqual(['wolfbrook'])
    expect(payeeTokens('WENDELL PROPERTY MAN')).toEqual(['wendell', 'man'])
  })
})

describe('matchClientsForPayee', () => {
  it('maps a B&T branch payee to all Barfoot clients (manager scope)', () => {
    const m = matchClientsForPayee('B&T Onehunga', CLIENTS)
    expect(m).toContain('Barfoot & Thompson - Onehunga')
    expect(m).toContain('Barfoot & Thompson - Remuera') // manager-level scope
  })

  it('maps a property manager payee to that client only', () => {
    expect(matchClientsForPayee('WOLFBROOK PROPERTY M', CLIENTS)).toEqual(['Wolfbrook Property'])
    expect(matchClientsForPayee('WENDELL PROPERTY MAN', CLIENTS)).toEqual(['Wendell Property'])
  })

  it('matches a direct client by name token', () => {
    expect(matchClientsForPayee('D/C FROM E WORK', CLIENTS)).toEqual(['E Work'])
  })

  it('returns empty when nothing significant matches', () => {
    expect(matchClientsForPayee('D/C FROM SOMEONE ELSE', CLIENTS)).toEqual([])
  })
})
