using System.Collections.Generic;
using UnityEngine;
using SurvivorGame.Core;

namespace SurvivorGame.Skills
{
    /// <summary>
    /// SkillManager — 技能管理器
    /// Web equivalent: SkillComponent.js
    /// </summary>
    public class SkillManager : MonoBehaviour
    {
        [SerializeField] private SkillData[] _allSkills;
        [SerializeField] private int _maxWeapons = 4;

        private Dictionary<string, int> _ownedSkills = new();
        private List<WeaponSkill> _activeWeapons = new();

        public IReadOnlyDictionary<string, int> OwnedSkills => _ownedSkills;

        public void AddSkill(string skillId)
        {
            if (_ownedSkills.ContainsKey(skillId))
            {
                var data = FindData(skillId);
                if (data != null && _ownedSkills[skillId] < data.MaxLevel)
                    _ownedSkills[skillId]++;
            }
            else
            {
                _ownedSkills[skillId] = 1;
                var data = FindData(skillId);
                if (data != null && data.Type == SkillType.Weapon)
                    SpawnWeapon(data);
            }
            RecalcPassives();
        }

        public string[] GetThreeOptions()
        {
            var pool = new List<SkillData>();
            foreach (var s in _allSkills)
            {
                if (s.Type == SkillType.Active) continue;
                if (s.Type == SkillType.Weapon && WeaponCount() >= _maxWeapons
                    && !_ownedSkills.ContainsKey(s.SkillId)) continue;
                if (_ownedSkills.ContainsKey(s.SkillId) && _ownedSkills[s.SkillId] >= s.MaxLevel) continue;
                pool.Add(s);
            }
            Shuffle(pool);
            var result = new List<string>();
            for (int i = 0; i < Mathf.Min(3, pool.Count); i++)
                result.Add(pool[i].SkillId);
            return result.ToArray();
        }

        private int WeaponCount()
        {
            int c = 0;
            foreach (var kv in _ownedSkills)
            {
                var d = FindData(kv.Key);
                if (d != null && d.Type == SkillType.Weapon) c++;
            }
            return c;
        }

        private void SpawnWeapon(SkillData data)
        {
            var go = new GameObject($"Weapon_{data.SkillId}");
            go.transform.SetParent(transform);
            var w = go.AddComponent<WeaponSkill>();
            w.Init(data, this);
            _activeWeapons.Add(w);
        }

        private void RecalcPassives()
        {
            var ctrl = GetComponent<Player.PlayerController>();
            if (ctrl == null) return;
            float atkMod = 1f, spdMod = 1f, movMod = 1f;
            foreach (var kv in _ownedSkills)
            {
                var d = FindData(kv.Key);
                if (d == null || d.Type != SkillType.Passive) continue;
                int lvl = Mathf.Clamp(kv.Value - 1, 0, d.ModifierValuePerLevel.Length - 1);
                float val = d.ModifierValuePerLevel[lvl];
                switch (d.ModifierType)
                {
                    case StatModifierType.AttackPower: atkMod += val; break;
                    case StatModifierType.AttackSpeed: spdMod += val; break;
                    case StatModifierType.MoveSpeed: movMod += val; break;
                }
            }
            ctrl.AttackPowerModifier = atkMod;
            ctrl.AttackSpeedModifier = spdMod;
            ctrl.MoveSpeedModifier = movMod;
        }

        public SkillData FindData(string id)
        {
            if (_allSkills == null) return null;
            foreach (var s in _allSkills)
                if (s.SkillId == id) return s;
            return null;
        }

        public int GetLevel(string id) =>
            _ownedSkills.ContainsKey(id) ? _ownedSkills[id] : 0;

        private void Shuffle<T>(List<T> list)
        {
            for (int i = list.Count - 1; i > 0; i--)
            {
                int j = Random.Range(0, i + 1);
                (list[i], list[j]) = (list[j], list[i]);
            }
        }
    }
}
