/**
 * 舰船相关静态常量
 */

/** 等级罗马数字映射 */
export const ROMA: Record<string, string> = {
  '1': 'I',
  '2': 'II',
  '3': 'III',
  '4': 'IV',
  '5': 'V',
  '6': 'VI',
  '7': 'VII',
  '8': 'VIII',
  '9': 'IX',
  '10': 'X',
  '11': '★'
}

/** 舰船类型简化信息 */
export interface ShipTypeInfo {
  tag: string
  color: string
}

/** 舰船类型简化映射，颜色为 naive-ui 标准状态颜色 */
export const SIMPLE_TYPE: Record<string, ShipTypeInfo> = {
  Submarine: {
    tag: 'SS',
    color: 'error'
  },
  Destroyer: {
    tag: 'DD',
    color: 'success'
  },
  Cruiser: {
    tag: 'CA',
    color: 'info'
  },
  Battleship: {
    tag: 'BB',
    color: 'primary'
  },
  AirCarrier: {
    tag: 'CV',
    color: 'warning'
  }
}

/** 舰船轮廓图填充色（按舰种类型） */
export const SHIP_TYPE_FILL_COLOR: Record<string, string> = {
  Submarine: '#ADC9CC',
  Destroyer: '#D9E7DC',
  Cruiser: '#BFC7E6',
  Battleship: '#AEB1AF',
  AirCarrier: '#C8C8C8'
}
