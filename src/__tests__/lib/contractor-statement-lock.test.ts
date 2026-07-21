import { statementEditBlock } from '@/lib/contractor-statement-lock'

describe('statementEditBlock', () => {
  it('allows edits when there is no statement or it is still a draft', () => {
    expect(statementEditBlock(null, null)).toBeNull()
    expect(statementEditBlock('draft', 'STMT-0001')).toBeNull()
  })

  it('blocks edits once the statement is issued or beyond', () => {
    for (const status of ['issued', 'superseded', 'confirmed', 'paid']) {
      const msg = statementEditBlock(status, 'STMT-0007')
      expect(msg).toContain('STMT-0007')
      expect(msg).toContain(status)
      expect(msg).toMatch(/supersede/i)
    }
  })
})
