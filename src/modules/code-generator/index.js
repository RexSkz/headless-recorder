import Optimizer from './optimizer'
import PuppeteerCodeGenerator from '@/modules/code-generator/puppeteer'
import PlaywrightCodeGenerator from '@/modules/code-generator/playwright'

export default class CodeGenerator {
  constructor(options = {}) {
    this.optimizer = new Optimizer(options)
    this.puppeteerGenerator = new PuppeteerCodeGenerator(options)
    this.playwrightGenerator = new PlaywrightCodeGenerator(options)
  }

  generate(recording) {
    const optimizedRecording = this.optimizer.optimize(recording)
    return {
      puppeteer: this.puppeteerGenerator.generate(optimizedRecording),
      playwright: this.playwrightGenerator.generate(optimizedRecording),
      optimizedRecording,
    }
  }
}
