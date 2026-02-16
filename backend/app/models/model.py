"""モデル情報用 Pydantic データモデル。

AIモデルの設定情報を管理するモデルを定義します。
モデル可視化機能のために使用します。
"""

from typing import Literal
from pydantic import BaseModel


class ModelConfig(BaseModel):
    """個別モデルの設定情報。

    モデルID、色、アイコン、ラベル、プロバイダーを含みます。
    フロントエンドでの視覚的表現に使用します。
    """

    id: str
    color: str
    icon: str
    label: str
    provider: Literal["anthropic", "moonshot", "zhipu", "other"]


class ModelListResponse(BaseModel):
    """モデル一覧のレスポンスモデル。

    利用可能な全モデルの設定リストを返します。
    """

    models: list[ModelConfig]
