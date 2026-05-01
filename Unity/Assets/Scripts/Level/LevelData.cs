using UnityEngine;

namespace SurvivorGame.Level
{
    [CreateAssetMenu(fileName = "NewLevel", menuName = "SurvivorGame/Level Data")]
    public class LevelData : ScriptableObject
    {
        public string LevelId;
        public string DisplayName;
        public int KillsToOpenBoss = 5;
        public SpawnPoint[] Spawns;
    }
}
