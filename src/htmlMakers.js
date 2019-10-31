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
  <p class="flex-grow mb-1 text-break">${description}</p>`;
  feedsListTag.prepend(newFeedElem);
};

const visualize = (postTitle, searchText, predicate) => {
  if (searchText.length > 0) {
    return predicate && postTitle.toLowerCase().includes(searchText) ? '' : 'd-none';
  }
  return predicate ? '' : 'd-none';
};

export const makePostsList = (freshPosts, activeFeedId, searchText) => {
  const descriptionBuffer = document.createElement('div');
  const [currentFeedId, posts] = freshPosts;
  const predicate = !activeFeedId || activeFeedId === 'sameFeed' || activeFeedId === currentFeedId;
  let liColl = [];
  posts.forEach((post) => {
    const {
      postTitle, postUrl, postDescription, postId,
    } = post;
    const newStoryTag = document.createElement('li');
    const visualization = visualize(postTitle, searchText, predicate);

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

export const displayHidePosts = (selectedPosts, allPosts) => {
  if (selectedPosts.length === allPosts.length) {
    allPosts.forEach(({ classList }) => classList.remove('d-none'));
    return;
  }
  allPosts.forEach(({ id, classList }) => {
    const foundPost = selectedPosts.find(({ postId }) => postId === id);
    const action = foundPost ? 'remove' : 'add';
    classList[action]('d-none');
  });
};
