import YAML from 'yaml'
import fs from 'fs'
import { pluginRoot } from '../model/path.js'

class Config {
  getConfig() {
    try {
      return YAML.parse(
        fs.readFileSync(`${pluginRoot}/config/config/config.yaml`, 'utf-8')
      )
    } catch (error) {
      logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`读取 config.yaml 失败`), logger.red(error));
      return false
    }
  }

  getDefConfig() {
    try {
      return YAML.parse(
        fs.readFileSync(`${pluginRoot}/config/config_default.yaml`, 'utf-8')
      )
    } catch (error) {
      logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`读取 config_default.yaml 失败`), logger.red(error));
      return false
    }
  }

  setConfig(config_data) {
    try {
      fs.writeFileSync(
        `${pluginRoot}/config/config/config.yaml`,
        YAML.stringify(config_data),
      )
      return true
    } catch (error) {
      logger.mark(logger.blue('[ExLoli PLUGIN]'), logger.cyan(`写入 config.yaml 失败`), logger.red(error));
      return false
    }
  }
}

export default new Config()
