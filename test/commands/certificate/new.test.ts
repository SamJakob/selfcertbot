import {expect, test} from '@oclif/test'

describe('certificate:new', () => {
  test
  .stdout()
  .command(['certificate:new'])
  .it('runs hello', ctx => {
    expect(ctx.stdout).to.contain('hello world')
  })

  test
  .stdout()
  .command(['certificate:new', '--name', 'jeff'])
  .it('runs hello --name jeff', ctx => {
    expect(ctx.stdout).to.contain('hello jeff')
  })
})
