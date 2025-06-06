package lila.ublog
package ui

import lila.ui.*

import ScalatagsTemplate.{ *, given }

final class UblogPostUi(helpers: Helpers, ui: UblogUi)(
    ublogRank: UblogRank,
    connectLinks: Frag
):
  import helpers.{ *, given }

  def page(
      user: User,
      blog: UblogBlog,
      post: UblogPost,
      markup: Frag,
      others: List[UblogPost.PreviewPost],
      liked: Boolean,
      followable: Boolean,
      followed: Boolean
  )(using ctx: Context) =
    Page(s"${trans.ublog.xBlog.txt(user.username)} • ${post.title}")
      .css("bits.ublog")
      .js(Esm("bits.expandText") ++ ctx.isAuth.so(Esm("bits.ublog")))
      .graph(
        OpenGraph(
          `type` = "article",
          image = post.image.isDefined.option(ui.thumbnailUrl(post, _.Size.Large)),
          title = post.title,
          url = s"$netBaseUrl${routes.Ublog.post(user.username, post.slug, post.id)}",
          description = post.intro
        )
      )
      .copy(atomLinkTag =
        link(
          href     := routes.Ublog.userAtom(user.username),
          st.title := trans.ublog.xBlog.txt(user.username)
        ).some
      )
      .flag(_.noRobots, !blog.listed || !post.indexable || blog.tier < UblogRank.Tier.HIGH)
      .csp(_.withTwitter.withInlineIconFont):
        main(cls := "page-menu page-small")(
          ui.menu(Left(user.id)),
          div(cls := "page-menu__content box box-pad ublog-post")(
            post.image.map: image =>
              frag(
                ui.thumbnail(post, _.Size.Large)(cls := "ublog-post__image"),
                image.credit.map { p(cls := "ublog-post__image-credit")(_) }
              ),
            (ctx.is(user) || Granter.opt(_.ModerateBlog)).option(standardFlash),
            h1(cls := "ublog-post__title")(post.title),
            Granter.opt(_.ModerateBlog).option(modTools(blog, post)),
            div(cls := "ublog-post__meta")(
              a(
                cls      := userClass(user.id, none, withOnline = true),
                href     := routes.Ublog.index(user.username),
                dataHref := routes.User.show(user.username)
              )(userLinkContent(user)),
              iconTag(Icon.InfoCircle)(
                cls      := "ublog-post__meta__disclaimer",
                st.title := "Opinions expressed by Lichess contributors are their own."
              ),
              post.lived.map: live =>
                span(cls := "ublog-post__meta__date")(semanticDate(live.at)),
              post.live.option(likeButton(post, liked, showText = false)),
              post.live.option(
                span(cls := "ublog-post__views")(
                  trans.ublog.nbViews.plural(post.views.value, strong(post.views.value.localize))
                )
              ),
              if ctx.is(user) then
                div(cls := "ublog-post__meta__owner")(
                  if post.live then goodTag(trans.ublog.thisPostIsPublished())
                  else badTag(trans.ublog.thisIsADraft()),
                  " ",
                  editButton(post)
                )
              else if Granter.opt(_.ModerateBlog) || (user.is(UserId.lichess) && Granter.opt(_.Pages)) then
                editButton(post)
              else if !post.live then badTag(trans.ublog.thisIsADraft())
              else
                a(
                  titleOrText(trans.site.reportXToModerators.txt(user.username)),
                  cls  := "button button-empty ublog-post__meta__report",
                  href := addQueryParams(
                    routes.Report.form.url,
                    Map(
                      "username" -> user.username.value,
                      "postUrl"  -> s"$netBaseUrl${ui.urlOfPost(post)}",
                      "from"     -> "ublog"
                    )
                  ),
                  dataIcon := Icon.CautionTriangle
                )
              ,
              langList.nameByLanguage(post.language)
            ),
            div(cls := "ublog-post__topics")(
              post.topics.map: topic =>
                a(href := routes.Ublog.topic(topic.url, 1))(topic.value)
            ),
            (~post.ads).option(
              div(dataIcon := Icon.InfoCircle, cls := "ublog-post__ads-disclosure text")(
                "Contains sponsored content, affiliate links or commercial advertisement"
              )
            ),
            strong(cls := "ublog-post__intro")(post.intro),
            div(cls := "ublog-post__markup expand-text")(markup),
            post.isLichess.option(
              div(cls := "ublog-post__lichess")(
                connectLinks,
                p(a(href := routes.Plan.index())(trans.site.lichessPatronInfo()))
              )
            ),
            div(cls := "ublog-post__footer")(
              (post.live && ~post.discuss).option(
                a(
                  href     := routes.Ublog.discuss(post.id),
                  cls      := "button text ublog-post__discuss",
                  dataIcon := Icon.BubbleConvo
                )(trans.ublog.discussThisBlogPostInTheForum())
              ),
              (ctx.isAuth && ctx.isnt(user)).option(
                div(cls := "ublog-post__actions")(
                  likeButton(post, liked, showText = true),
                  followable.option(followButton(user, followed))
                )
              ),
              (others.length > 0).option(
                div(
                  h2("You may also like"),
                  div(cls := "ublog-post-cards")(
                    others.map:
                      ui.card(_, showAuthor = ui.ShowAt.top, showIntro = true)
                  )
                )
              )
            )
          )
        )

  private def editButton(post: UblogPost)(using Context) = a(
    href     := ui.editUrlOfPost(post),
    cls      := "button button-empty text",
    dataIcon := Icon.Pencil
  )(trans.site.edit())

  private def likeButton(post: UblogPost, liked: Boolean, showText: Boolean)(using Context) =
    val text = if liked then trans.study.unlike.txt() else trans.study.like.txt()
    button(
      tpe := "button",
      cls := List(
        "ublog-post__like is"                     -> true,
        "ublog-post__like--liked"                 -> liked,
        "ublog-post__like--big button button-red" -> showText,
        "ublog-post__like--mini button-link"      -> !showText
      ),
      dataRel := post.id,
      title   := text
    )(
      span(cls := "ublog-post__like__nb")(post.likes.value.localize),
      showText.option(
        span(
          cls                      := "button-label",
          attr("data-i18n-like")   := trans.study.like.txt(),
          attr("data-i18n-unlike") := trans.study.unlike.txt()
        )(text)
      )
    )

  private def followButton(user: User, followed: Boolean)(using Context) =
    div(
      cls := List(
        "ublog-post__follow" -> true,
        "followed"           -> followed
      )
    ):
      List(
        ("yes", trans.site.unfollowX, routes.Relation.unfollow, Icon.Checkmark),
        ("no", trans.site.followX, routes.Relation.follow, Icon.ThumbsUp)
      ).map: (role, text, route, icon) =>
        button(
          cls      := s"ublog-post__follow__$role button",
          dataIcon := icon,
          dataRel  := route(user.id)
        )(
          span(cls := "button-label")(text(user.titleUsername))
        )

  private def modTools(blog: UblogBlog, post: UblogPost)(using Context) =
    ublogRank
      .computeRank(blog, post)
      .map: rank =>
        postForm(cls := "ublog-post__meta", action := routes.Ublog.modAdjust(post.id))(
          fieldset(cls := "ublog-post__mod-tools")(
            legend(
              span(
                span(
                  label("Rank date:"),
                  if ~post.pinned then "pinned"
                  else span(cls := "ublog-post__meta__date")(semanticDate(rank.value))
                ),
                form3.submit("Submit")(cls := "button-empty")
              )
            ),
            div(
              span(
                input(
                  tpe   := "checkbox",
                  id    := "ublog-post-pinned",
                  name  := "pinned",
                  value := "true",
                  post.pinned.has(true).option(checked)
                ),
                label(`for` := "ublog-post-pinned")(" Pin to top")
              ),
              span(
                "User tier:",
                st.select(name := "tier", cls := "form-control")(UblogRank.Tier.verboseOptions.map:
                  (value, name) =>
                    st.option(st.value := value.toString, (blog.tier == value).option(selected))(name))
              ),
              span(
                "Post adjust:",
                input(
                  tpe   := "number",
                  name  := "days",
                  min   := -180,
                  max   := 180,
                  value := post.rankAdjustDays.so(_.toString)
                ),
                "days"
              )
            ),
            post.automod.map: automod =>
              val current = automod.classification match
                case "quality"    => "good"
                case "phenomenal" => "great"
                case other        => other // delete once ublog_post collection is fully migrated
              span(cls := "automod")(
                span(
                  "Assessment:",
                  st.select(name := "assessment", cls := "form-control")(
                    UblogAutomod.classifications.map: assessment =>
                      st.option(
                        st.value := assessment,
                        (assessment == current).option(selected)
                      )(assessment)
                  )
                ),
                span(
                  automod.evergreen.collect:
                    case true => iconFlair(Flair("nature.evergreen-tree"))(title := "Evergreen content"),
                  automod.flagged.map: flagged =>
                    i(cls := "flagged", dataIcon := Icon.CautionTriangle, title := flagged),
                  automod.commercial.map: commercial =>
                    i(cls := "commercial", title := commercial)("$"),
                  automod.offtopic.map: offtopic =>
                    i(cls := "offtopic", dataIcon := Icon.Tag, title := offtopic)
                )
              )
          )
        )
