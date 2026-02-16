/**
 * teamModels ユーティリティの単体テスト。
 *
 * T-UT-TM-001: computeTeamModels 基本機能
 * T-UT-TM-002: computeTeamModels ソート順序
 * T-UT-TM-003: computeTeamModelSummary
 * T-UT-TM-004: getUniqueModelIds
 * T-UT-TM-005: 未知のモデルの扱い
 *
*/
import { describe, it, expect } from 'vitest'
import { computeTeamModels, computeTeamModelSummary, getUniqueModelIds } from '../teamModels'
import type { Member } from '@/types/team'
import type { Team } from '@/types/team'

describe('teamModels ユーティリティ', () => {
  const mockMembers: Member[] = [
    {
      agentId: 'agent-1',
      name: 'architect',
      agentType: 'frontend',
      model: 'claude-opus-4-6',
      joinedAt: Date.now(),
      cwd: '/workspace',
      subscriptions: [],
      status: 'active',
    },
    {
      agentId: 'agent-2',
      name: 'developer',
      agentType: 'frontend',
      model: 'claude-opus-4-6',
      joinedAt: Date.now(),
      cwd: '/workspace',
      subscriptions: [],
      status: 'active',
    },
    {
      agentId: 'agent-3',
      name: 'reviewer',
      agentType: 'frontend',
      model: 'claude-sonnet-4-5',
      joinedAt: Date.now(),
      cwd: '/workspace',
      subscriptions: [],
      status: 'active',
    },
    {
      agentId: 'agent-4',
      name: 'tester',
      agentType: 'frontend',
      model: 'kimi-k2.5',
      joinedAt: Date.now(),
      cwd: '/workspace',
      subscriptions: [],
      status: 'active',
    },
  ]

  describe('T-UT-TM-001: computeTeamModels 基本機能', () => {
    it('メンバーからモデル使用状況を算出する', () => {
      const result = computeTeamModels(mockMembers)

      expect(result).toHaveLength(3) // Opus, Sonnet, Kimi
      expect(result[0].config.id).toBe('claude-opus-4-6')
      expect(result[0].count).toBe(2)
      expect(result[0].agents).toEqual(['architect', 'developer'])
    })

    it('各モデルのエージェント名を正しく集計する', () => {
      const result = computeTeamModels(mockMembers)

      const opusModel = result.find(m => m.config.id === 'claude-opus-4-6')
      const sonnetModel = result.find(m => m.config.id === 'claude-sonnet-4-5')
      const kimiModel = result.find(m => m.config.id === 'kimi-k2.5')

      expect(opusModel?.agents).toEqual(['architect', 'developer'])
      expect(sonnetModel?.agents).toEqual(['reviewer'])
      expect(kimiModel?.agents).toEqual(['tester'])
    })
  })

  describe('T-UT-TM-002: computeTeamModels ソート順序', () => {
    it('使用数の降順でソートする', () => {
      const members: Member[] = [
        { ...mockMembers[0], model: 'claude-haiku-4-5', name: 'agent-1' },
        { ...mockMembers[0], model: 'claude-opus-4-6', name: 'agent-2' },
        { ...mockMembers[0], model: 'claude-opus-4-6', name: 'agent-3' },
        { ...mockMembers[0], model: 'claude-opus-4-6', name: 'agent-4' },
      ]

      const result = computeTeamModels(members)

      expect(result[0].config.id).toBe('claude-opus-4-6') // count: 3
      expect(result[1].config.id).toBe('claude-haiku-4-5') // count: 1
    })

    it('同数の場合、登録順を維持する', () => {
      const members: Member[] = [
        { ...mockMembers[0], model: 'claude-opus-4-6', name: 'agent-1' },
        { ...mockMembers[0], model: 'claude-sonnet-4-5', name: 'agent-2' },
      ]

      const result = computeTeamModels(members)

      expect(result[0].count).toBe(1)
      expect(result[1].count).toBe(1)
    })
  })

  describe('T-UT-TM-003: computeTeamModelSummary', () => {
    it('チームからモデルサマリーを作成する', () => {
      const mockTeam: Team = {
        name: 'test-team',
        description: 'Test team',
        createdAt: Date.now(),
        leadAgentId: 'architect',
        members: mockMembers,
      }

      const result = computeTeamModelSummary(mockTeam)

      expect(result.teamName).toBe('test-team')
      expect(result.models).toHaveLength(3)
      expect(result.primaryModel).toBe('claude-opus-4-6') // 最も使用されているモデル
    })

    it('空のメンバーリストでも正しく動作する', () => {
      const mockTeam: Team = {
        name: 'empty-team',
        createdAt: Date.now(),
        leadAgentId: 'lead',
        members: [],
      }

      const result = computeTeamModelSummary(mockTeam)

      expect(result.teamName).toBe('empty-team')
      expect(result.models).toHaveLength(0)
      expect(result.primaryModel).toBe('unknown')
    })
  })

  describe('T-UT-TM-004: getUniqueModelIds', () => {
    it('ユニークなモデルIDリストを返す', () => {
      const result = getUniqueModelIds(mockMembers)

      expect(result).toHaveLength(3)
      expect(result).toContain('claude-opus-4-6')
      expect(result).toContain('claude-sonnet-4-5')
      expect(result).toContain('kimi-k2.5')
    })

    it('重複するモデルを除外する', () => {
      const members: Member[] = [
        { ...mockMembers[0], model: 'claude-opus-4-6', name: 'agent-1' },
        { ...mockMembers[0], model: 'claude-opus-4-6', name: 'agent-2' },
        { ...mockMembers[0], model: 'claude-opus-4-6', name: 'agent-3' },
      ]

      const result = getUniqueModelIds(members)

      expect(result).toHaveLength(1)
      expect(result[0]).toBe('claude-opus-4-6')
    })

    it('空の配列の場合は空の配列を返す', () => {
      const result = getUniqueModelIds([])
      expect(result).toHaveLength(0)
    })
  })

  describe('T-UT-TM-005: 未知のモデルの扱い', () => {
    it('未知のモデルIDでもデフォルト設定を使用する', () => {
      const members: Member[] = [
        { ...mockMembers[0], model: 'unknown-model-x', name: 'agent-1' },
      ]

      const result = computeTeamModels(members)

      expect(result).toHaveLength(1)
      expect(result[0].config.id).toBe('unknown')
      expect(result[0].config.label).toBe('Unknown')
      expect(result[0].config.color).toBe('#6B7280') // gray-500
    })

    it('既知と未知のモデルが混在しても正しく動作する', () => {
      const members: Member[] = [
        { ...mockMembers[0], model: 'claude-opus-4-6', name: 'agent-1' },
        { ...mockMembers[0], model: 'unknown-model', name: 'agent-2' },
      ]

      const result = computeTeamModels(members)

      expect(result).toHaveLength(2)
      expect(result.some(m => m.config.id === 'claude-opus-4-6')).toBe(true)
      expect(result.some(m => m.config.id === 'unknown')).toBe(true)
    })
  })
})
