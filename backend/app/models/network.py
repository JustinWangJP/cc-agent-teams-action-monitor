"""ネットワークグラフ用 Pydantic データモデル。

エージェント通信ネットワークのノードとエッジを表現するモデルを定義します。
D3.js フォースグラフでの可視化に使用します。
"""

from pydantic import BaseModel


class ModelInfo(BaseModel):
    """モデル情報の設定。

    モデルID、色、アイコンを含みます。
    """
    id: str
    color: str
    icon: str


class AgentNode(BaseModel):
    """エージェントノードのデータモデル。

    ノードの識別子、ラベル、モデル情報、メッセージ統計を含みます。
    """
    id: str
    label: str
    model: str
    modelColor: str
    modelIcon: str
    messageCount: int
    sentCount: int
    receivedCount: int


class EdgeTypeCounts(BaseModel):
    """エッジのメッセージタイプ別カウント。

    各プロトコルメッセージタイプの数を記録します。
    """
    message: int = 0
    idle_notification: int = 0
    shutdown_request: int = 0
    shutdown_response: int = 0
    plan_approval: int = 0
    other: int = 0


class CommunicationEdge(BaseModel):
    """エージェント間通信エッジのデータモデル。

    送信者から受信者への通信関係を表します。
    メッセージ数、タイプ別内訳、最終通信時刻を含みます。
    """
    source: str
    target: str
    count: int
    types: EdgeTypeCounts
    dominantType: str
    lastTimestamp: str


class NetworkTimeRange(BaseModel):
    """ネットワークデータの時間範囲。

    最小・最大タイムスタンプを含みます。
    """
    min: str
    max: str


class NetworkMeta(BaseModel):
    """ネットワークデータのメタ情報。

    総メッセージ数と時間範囲を含みます。
    """
    totalMessages: int
    timeRange: NetworkTimeRange


class NetworkData(BaseModel):
    """ネットワークグラフデータのレスポンスモデル。

    ノード配列、エッジ配列、チーム名、メタ情報を含みます。
    """
    nodes: list[AgentNode]
    edges: list[CommunicationEdge]
    teamName: str
    meta: NetworkMeta
