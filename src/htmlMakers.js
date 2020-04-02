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

const visualize = (inputState, predicate) => {
  if (inputState === 'matched') {
    return 'd-none';
  }
  return predicate ? '' : 'd-none';
};

export const makePostsList = (freshPosts, activeFeedId, inputState) => {
  const [currentFeedId, posts] = freshPosts;
  const predicate = !activeFeedId || activeFeedId === currentFeedId;
  let liColl = [];
  posts.forEach((post) => {
    const {
      postTitle, postUrl, postDescription, postId,
    } = post;
    const newStoryTag = document.createElement('li');
    const visualization = visualize(inputState, predicate);

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
            <div class="modal-body">${postDescription}</div>
          </div>
        </div>
      </div>`;
    liColl = [newStoryTag, ...liColl];
  });
  return liColl;
};

export const displayHidePosts = (selectedPosts, allPosts, searchText) => {
  if (selectedPosts.length === allPosts.length || selectedPosts.length === 0) {
    allPosts.forEach((post) => {
      const title = post.querySelector('a');
      title.innerHTML = title.innerText;
      post.classList.remove('d-none');
    });
    return;
  }
  allPosts.forEach((post) => {
    const foundPost = selectedPosts.find(({ postId }) => postId === post.id);
    const { classList } = post;
    if (!foundPost) {
      classList.add('d-none');
      return;
    }
    const title = post.querySelector('a');
    if (!searchText) {
      title.innerHTML = title.innerText;
      classList.remove('d-none');
      return;
    }
    const { postTitle } = foundPost;
    const pos = postTitle.toLowerCase().indexOf(searchText);
    const titlePart = postTitle.slice(pos, pos + searchText.length);
    const highlightedStr = `<span class="bg-primary text-light">${titlePart}</span>`;
    const basicStrArr = postTitle.split('');
    basicStrArr.splice(pos, searchText.length, highlightedStr);
    title.innerHTML = basicStrArr.join('');
    classList.remove('d-none');
  });
};
