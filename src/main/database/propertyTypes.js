/** Property type definitions and config schemas */
export const PROPERTY_TYPES = {
  text: {
    valueColumn: 'value_text',
    configSchema: null
  },
  'text-eltable': {
    valueColumn: 'value_text',
    configSchema: null
  },
  number: {
    valueColumn: 'value_num',
    configSchema: null
  },
  select: {
    valueColumn: 'value_text',
    configSchema: { options: ['string'] } // e.g. { options: ['Draft', 'Review', 'Done'] }
  },
  date: {
    valueColumn: 'value_num', // stored as timestamp
    configSchema: null
  },
  checkbox: {
    valueColumn: 'value_bool',
    configSchema: null
  }
}

/** Get the value column for a property type */
export const getValueColumn = (type) => {
  return PROPERTY_TYPES[type]?.valueColumn || 'value_text'
}

/** Validate that a property type is supported */
export const isValidPropertyType = (type) => {
  return type in PROPERTY_TYPES
}

export default PROPERTY_TYPES
