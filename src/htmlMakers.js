export const makeFeedItem = (feeds, feedsListTag) => {
  const { length } = feeds;
  const {
    feedId, feedTitle, feedDescription, currentFeedAllPostsSize,
  } = feeds[length - 1];
  const newFeedItem = document.createElement('div');
  feedsListTag.prepend(newFeedItem);
  newFeedItem.outerHTML = `<li class="list-group-item list-group-item-action rounded border mb-1 d-block" id="${feedId}">
    <div class="d-flex justify-content-center">
      <h5 class="flex-fill mb-1">${feedTitle}</h5>
      <div>
        <span id="${feedId}-badge" class="badge badge-success badge-pill mb-0">${currentFeedAllPostsSize}</span>
      </div>
    </div>
    <p class="flex-fill mb-1">${feedDescription}</p>
  </li>`;
};

export const makePostsList = (posts, postsTag) => {
  const descriptionBuffer = document.createElement('div');
  posts.forEach((post) => {
    const [postTitle, postUrl, postDescription, postId] = post;
    const getPureDescription = () => {
      descriptionBuffer.innerHTML = postDescription;
      return descriptionBuffer.textContent;
    };
    const newStoryTag = document.createElement('div');
    postsTag.prepend(newStoryTag);
    newStoryTag.outerHTML = `<li class="list-group-item rounded border mb-1 d-block" id="${postId}">
      <a href="${postUrl}">${postTitle}</a>
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
            <div class="modal-body">${getPureDescription()}</div>
          </div>
        </div>
      </div>
    </li>`;
  });
};
