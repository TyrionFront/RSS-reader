/* global document */
/* eslint no-undef: "error" */

export const makeRssFeedsList = ({ feeds }, feedsTag, example) => {
  const { rssInfo, lastFeedId } = feeds;
  const lastRssInfo = rssInfo[lastFeedId];
  if (feedsTag.contains(example)) {
    feedsTag.removeChild(example);
  }
  const { title, description, newsCount } = lastRssInfo;
  const li = document.createElement('li');
  li.className = 'list-group-item list-group-item-action';
  const div = document.createElement('div');
  div.className = 'd-flex w-100 justify-content-between';
  div.innerHTML = `<h5 class="mb-1">${title}</h5>`;
  const p = document.createElement('p');
  p.className = 'mb-1';
  p.textContent = description;
  const span = document.createElement('span');
  span.id = `newsCount${lastFeedId}`;
  span.className = 'badge badge-warning badge-pill';
  span.style = 'position: relative; left: 80%;';
  span.textContent = `${newsCount}`;
  li.append(div, p, span);
  feedsTag.prepend(li);
};

export const makeNewsList = ({ feeds }, newsTag) => {
  const { lastFeedId, items } = feeds;
  const { freshNews, allNews } = items;
  const currentFeedAllNewsCount = Object.keys(allNews[lastFeedId]).length;
  const currentFreshNewsList = freshNews[lastFeedId];
  const currentFreshNewsTitles = Object.keys(currentFreshNewsList);
  const badge = document.getElementById(`newsCount${lastFeedId}`);
  currentFreshNewsTitles.forEach((title, i) => {
    const [link, description] = currentFreshNewsList[title];
    const li = document.createElement('li');
    const storyId = `story${i + currentFeedAllNewsCount}${lastFeedId}`;
    li.className = 'list-group-item';
    li.innerHTML = `<a href="${link}">${title}</a>
      <button type="button" class="btn btn-outline-info btn-sm"
      data-toggle="modal" data-target="#${storyId}" style="margin-left: 5%;">read more</button>`;
    const modal = document.createElement('div');
    modal.className = 'modal fade bd-example-modal-lg';
    modal.id = storyId;
    modal.tabIndex = -1;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-labelledby', 'modalCenterTitle');
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `<div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="exampleModalLongTitle">${title}</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">${description}</div>
      </div>
    </div>`;
    li.append(modal);
    newsTag.prepend(li);
    newsTag.style.display = 'block'; // eslint-disable-line no-param-reassign
  });
  badge.textContent = currentFreshNewsTitles.length + currentFeedAllNewsCount;
};
