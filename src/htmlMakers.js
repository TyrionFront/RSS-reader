const getPureDescription = (bufferTag, content) => {
  bufferTag.innerHTML = content; // eslint-disable-line no-param-reassign
  const tags = [...bufferTag.children].filter(tag => tag.tagName === 'DIV' || tag.id);
  if (tags) {
    tags.forEach(tag => bufferTag.removeChild(tag));
  }
  return bufferTag.textContent;
};

export const makeFeedItem = (feeds, feedsListTag, markActive) => {
  const { length } = feeds;
  const {
    feedId, title, description, postsCount,
  } = feeds[length - 1];
  const newFeedElem = document.createElement('li');
  newFeedElem.className = 'list-group-item list-group-item-action rounded border mb-1 d-block';
  newFeedElem.id = `${feedId}`;
  newFeedElem.addEventListener('click', markActive);
  newFeedElem.innerHTML = `<div class="d-flex justify-content-center">
    <h5 class="flex-fill mb-1">${title}</h5>
      <div>
        <span id="${feedId}-badge" class="badge badge-success badge-pill mb-0">${postsCount}</span>
      </div>
  </div>
  <p class="flex-fill mb-1">${description}</p>`;
  feedsListTag.prepend(newFeedElem);
};

const visualize = (postId, selectedIds, predicate) => {
  if (selectedIds.size > 0) {
    return predicate && selectedIds.has(postId) ? '' : 'd-none';
  }
  return predicate ? '' : 'd-none';
};

export const makePostsList = (freshPosts, activeFeedId, selectedIds) => {
  const descriptionBuffer = document.createElement('div');
  const [currentFeedId, posts] = freshPosts;
  const predicate = !activeFeedId || activeFeedId === 'sameFeed' || activeFeedId === currentFeedId;
  let liColl = [];
  posts.forEach((post) => {
    const {
      postTitle, postUrl, postDescription, postId,
    } = post;
    const newStoryTag = document.createElement('li');
    const visualization = visualize(postId, selectedIds, predicate);

    newStoryTag.className = `${currentFeedId} list-group-item rounded border mb-1 ${visualization}`;
    newStoryTag.id = postId;
    newStoryTag.innerHTML = `<a href="${postUrl}" target="_blank">${postTitle}</a>
      <button type="button" class="btn btn-outline-info btn-sm ml-3" data-toggle="modal" data-target="#modal-${postId}">
        read more</button>
      <div class="modal fade bd-example-modal-lg" id="modal-${postId}" role="dialog" tabindex="-1"
        aria-labelledby="modalCenterTitle" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="#">${postTitle}</h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">${getPureDescription(descriptionBuffer, postDescription)}</div>
          </div>
        </div>
      </div>`;
    liColl = [newStoryTag, ...liColl];
  });
  return liColl;
};

const giveDisplayFns = () => [
  {
    check: (feedId, postIds) => (feedId === 'sameFeed' || feedId === '') && !postIds,
    displayFn: postsColl => postsColl.forEach(({ classList }) => classList.remove('d-none')),
  },
  {
    check: (feedId, postIds) => (feedId === 'sameFeed' || feedId === '') && postIds,
    displayFn: (postsColl, ids) => postsColl
      .forEach(({ classList, id }) => (ids.has(id)
        ? classList.remove('d-none') : classList.add('d-none'))),
  },
  {
    check: (feedId, postIds) => feedId && !postIds,
    displayFn: (postsColl, ids, activeFeedId) => postsColl.forEach(({ classList }) => (
      classList.contains(activeFeedId) ? classList.remove('d-none') : classList.add('d-none'))),
  },
  {
    check: (feedId, postIds) => feedId && postIds,
    displayFn: (postsColl, ids, activeFeedId) => postsColl
      .forEach(({ classList, id }) => (classList.contains(activeFeedId) && ids.has(id)
        ? classList.remove('d-none') : classList.add('d-none'))),
  },
];

export const displayHidePosts = (activeFeedId, postElements, selectedIds) => {
  const ids = selectedIds.size > 0 ? selectedIds : '';
  const { displayFn } = giveDisplayFns().find(({ check }) => check(activeFeedId, ids));
  displayFn(postElements, selectedIds, activeFeedId);
};
