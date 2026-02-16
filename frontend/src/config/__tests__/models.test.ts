/**
 * models 設定の単体テスト。
 *
 * T-CFG-MD-001: MODEL_CONFIGS 定義
 * T-CFG-MD-002: getModelConfig 関数
 * T-CFG-MD-003: getModelIdsByProvider 関数
 * T-CFG-MD-004: 既知モデルの設定値
 *
 * @
 */
import { describe, it, expect } from 'vitest'
import { MODEL_CONFIGS, getModelConfig, getModelIdsByProvider } from '../models'

describe('models 設定', () => {
  describe('T-CFG-MD-001: MODEL_CONFIGS 定義', () => {
    it('全ての必須フィールドを持つ', () => {
      Object.entries(MODEL_CONFIGS).forEach(([id, config]) => {
        expect(config).toHaveProperty('id')
        expect(config).toHaveProperty('color')
        expect(config).toHaveProperty('icon')
        expect(config).toHaveProperty('label')
        expect(config).toHaveProperty('provider')
        // 'default' キーは 'unknown' ID を持つ特殊ケース
        if (id !== 'default') {
          expect(config.id).toBe(id)
        } else {
          expect(config.id).toBe('unknown')
        }
      })
    })

    it('色コードは有効な HEX 形式である', () => {
      Object.values(MODEL_CONFIGS).forEach(config => {
        expect(config.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      })
    })

    it('アイコンは絵文字である', () => {
      Object.values(MODEL_CONFIGS).forEach(config => {
        expect(config.icon).toMatch(/^[\p{Emoji}\p{Emoji_Component}]+$/u)
      })
    })
  })

  describe('T-CFG-MD-002: getModelConfig 関数', () => {
    it('既知のモデルIDで正しい設定を返す', () => {
      const opus = getModelConfig('claude-opus-4-6')
      expect(opus.id).toBe('claude-opus-4-6')
      expect(opus.label).toBe('Opus 4.6')
      expect(opus.provider).toBe('anthropic')
      expect(opus.icon).toBe('🟣')
      expect(opus.color).toBe('#8B5CF6')
    })

    it('未知のモデルIDでデフォルト設定を返す', () => {
      const unknown = getModelConfig('non-existent-model')
      expect(unknown.id).toBe('unknown')
      expect(unknown.label).toBe('Unknown')
      expect(unknown.provider).toBe('other')
      expect(unknown.icon).toBe('⚪')
      expect(unknown.color).toBe('#6B7280')
    })

    it('デフォルト設定を直接指定した場合と同じ結果', () => {
      const fromDefault = getModelConfig('default')
      const fromUnknown = getModelConfig('unknown-model')

      expect(fromDefault.id).toBe(fromUnknown.id)
      expect(fromDefault.label).toBe(fromUnknown.label)
    })
  })

  describe('T-CFG-MD-003: getModelIdsByProvider 関数', () => {
    it('Anthropic プロバイダのモデルIDを取得する', () => {
      const anthropicModels = getModelIdsByProvider('anthropic')
      expect(anthropicModels).toContain('claude-opus-4-6')
      expect(anthropicModels).toContain('claude-sonnet-4-5')
      expect(anthropicModels).toContain('claude-haiku-4-5')
    })

    it('Moonshot プロバイダのモデルIDを取得する', () => {
      const moonshotModels = getModelIdsByProvider('moonshot')
      expect(moonshotModels).toContain('kimi-k2.5')
      expect(moonshotModels).toContain('kimi-k2')
    })

    it('Zhipu プロバイダのモデルIDを取得する', () => {
      const zhipuModels = getModelIdsByProvider('zhipu')
      expect(zhipuModels).toContain('glm-5')
      expect(zhipuModels).toContain('glm-4')
    })

    it('存在しないプロバイダで空の配列を返す', () => {
      const unknownModels = getModelIdsByProvider('unknown-provider')
      expect(unknownModels).toEqual([])
    })
  })

  describe('T-CFG-MD-004: 既知モデルの設定値', () => {
    describe('Claude Opus 4.6', () => {
      it('正しい設定値を持つ', () => {
        const config = MODEL_CONFIGS['claude-opus-4-6']
        expect(config.color).toBe('#8B5CF6') // violet-500
        expect(config.icon).toBe('🟣')
        expect(config.label).toBe('Opus 4.6')
        expect(config.provider).toBe('anthropic')
      })
    })

    describe('Claude Sonnet 4.5', () => {
      it('正しい設定値を持つ', () => {
        const config = MODEL_CONFIGS['claude-sonnet-4-5']
        expect(config.color).toBe('#3B82F6') // blue-500
        expect(config.icon).toBe('🔵')
        expect(config.label).toBe('Sonnet 4.5')
        expect(config.provider).toBe('anthropic')
      })
    })

    describe('Claude Haiku 4.5', () => {
      it('正しい設定値を持つ', () => {
        const config = MODEL_CONFIGS['claude-haiku-4-5']
        expect(config.color).toBe('#10B981') // green-500
        expect(config.icon).toBe('🟢')
        expect(config.label).toBe('Haiku 4.5')
        expect(config.provider).toBe('anthropic')
      })
    })

    describe('Kimi K2.5', () => {
      it('正しい設定値を持つ', () => {
        const config = MODEL_CONFIGS['kimi-k2.5']
        expect(config.color).toBe('#F59E0B') // amber-500
        expect(config.icon).toBe('🟡')
        expect(config.label).toBe('Kimi K2.5')
        expect(config.provider).toBe('moonshot')
      })
    })

    describe('GLM-5', () => {
      it('正しい設定値を持つ', () => {
        const config = MODEL_CONFIGS['glm-5']
        expect(config.color).toBe('#EF4444') // red-500
        expect(config.icon).toBe('🔴')
        expect(config.label).toBe('GLM-5')
        expect(config.provider).toBe('zhipu')
      })
    })

    describe('Default (Unknown)', () => {
      it('正しい設定値を持つ', () => {
        const config = MODEL_CONFIGS['default']
        expect(config.color).toBe('#6B7280') // gray-500
        expect(config.icon).toBe('⚪')
        expect(config.label).toBe('Unknown')
        expect(config.provider).toBe('other')
      })
    })
  })
})
