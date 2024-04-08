package lila.chat

import play.api.libs.json.JsArray

import lila.core.shutup.PublicSource
import lila.core.LightUser

case class UserModInfo(
    user: LightUser,
    history: List[ChatTimeout.UserEntry]
)

case class GetLinkCheck(line: UserLine, source: PublicSource, promise: Promise[Boolean])
case class IsChatFresh(source: PublicSource, promise: Promise[Boolean])

opaque type JsonChatLines = JsArray
object JsonChatLines extends TotalWrapper[JsonChatLines, JsArray]:
  def empty: JsonChatLines = JsArray.empty
