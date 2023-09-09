import axios from 'axios';
import { FormEvent, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LineWave } from 'react-loader-spinner';
import Modal from 'react-modal';
import { Link, useNavigate } from 'react-router-dom';
import { Tooltip } from 'react-tooltip';
import { useRecoilState } from 'recoil';

import { runtimeState } from '../lib/state/runtime.state';
import { Profile } from '../lib/types';

export const SidebarBottom = ({ profile }: { profile: Profile }) => {
  const [runtime, setRuntime] = useRecoilState(runtimeState);
  const navigate = useNavigate();
  const [feedbackForm, setFeedbackForm] = useState({
    email: '',
    category: '',
    feedback: '',
  });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const onFeedback = (e: FormEvent) => {
    e.preventDefault();

    setSubmittingFeedback(true);

    axios
      .post('https://feeder-node-1337.herokuapp.com/feedback/create', {
        feedbackEmail: feedbackForm.email,
        feedbackType: feedbackForm.category,
        feedbackMsg: feedbackForm.feedback,
        projectId: '64e657d83ee90d00026e2203',
      })
      .then((res) => {
        if (res.status === 200) {
          toast.success('Feedback submitted successfully!');
          setRuntime({
            ...runtime,
            showFeedbackWindow: false,
          });
        }

        setSubmittingFeedback(false);
      })
      .catch(() => {
        toast.error('Something went wrong while submitting your feedback. Please try again later.');

        setSubmittingFeedback(false);
      });
  };

  return (
    <>
      <Modal
        isOpen={runtime.showFeedbackWindow}
        onRequestClose={() => {
          setRuntime({
            ...runtime,
            showFeedbackWindow: false,
          });
        }}
        style={{
          content: {
            backgroundColor: 'var(--sidebar-bg)',
            border: 'none',
            padding: 0,
            width: '60%',
            height: 'min-content',
            margin: 'auto',
            borderRadius: '20px',
          },
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          },
        }}
      >
        <div className="animate__animated animate__fadeIn animate__faster">
          <div className="modal-top h-[250px] flex justify-center items-center flex-col">
            <div className="flex justify-end w-full mr-12">
              <svg
                className="cursor-pointer hover:opacity-100 transition-all"
                style={{
                  opacity: 'var(--icon-light-opacity)',
                }}
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                onClick={() => {
                  setRuntime({
                    ...runtime,
                    showFeedbackWindow: false,
                  });
                }}
              >
                <path
                  fill={'var(--icon-color)'}
                  d="M2.93 17.07A10 10 0 1 1 17.07 2.93A10 10 0 0 1 2.93 17.07zM11.4 10l2.83-2.83l-1.41-1.41L10 8.59L7.17 5.76L5.76 7.17L8.59 10l-2.83 2.83l1.41 1.41L10 11.41l2.83 2.83l1.41-1.41L11.41 10z"
                />
              </svg>
            </div>
            <img src="/byteslogo.svg" className="w-[150px]" />
            <h1
              className="text-3xl font-light"
              style={{
                color: 'var(--sidebar-inset-text-color)',
              }}
            >
              Give Us Your Feedback! 🎉
            </h1>
          </div>
          <div className="py-12 px-8">
            <form className="flex flex-col justify-center" onSubmit={onFeedback}>
              <p
                className="mb-4 text-md"
                style={{
                  opacity: 'var(--light-text-opacity)',
                }}
              >
                Email
              </p>
              <input
                type="email"
                required
                className={`text-sm p-3 rounded-md bg-sidebar border transition-all outline-none focus:border-gray-400 w-full`}
                style={{
                  borderColor: 'var(--sidebar-border-color)',
                  backgroundColor: 'var(--sidebar-inset-bg)',
                  color: 'var(--sidebar-inset-text-color)',
                }}
                placeholder="you@example.com"
                value={feedbackForm.email}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, email: e.target.value })}
              />
              <p
                className="mb-4 text-md mt-12"
                style={{
                  opacity: 'var(--light-text-opacity)',
                }}
              >
                Category (Optional)
              </p>
              <input
                type="text"
                placeholder="Ideas, Bugs, etc."
                className={`text-sm w-full p-3 rounded-md bg-sidebar border transition-all outline-none focus:border-gray-400`}
                value={feedbackForm.category}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, category: e.target.value })}
                style={{
                  borderColor: 'var(--sidebar-border-color)',
                  backgroundColor: 'var(--sidebar-inset-bg)',
                  color: 'var(--sidebar-inset-text-color)',
                }}
              />
              <p
                className="mb-4 text-md mt-12"
                style={{
                  opacity: 'var(--light-text-opacity)',
                }}
              >
                Feedback
              </p>
              <textarea
                required
                placeholder="I really like how..."
                value={feedbackForm.feedback}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, feedback: e.target.value })}
                className={`text-sm resize-none p-3 rounded-md  border transition-all outline-none focus:border-gray-400 w-full`}
                style={{
                  borderColor: 'var(--sidebar-border-color)',
                  backgroundColor: 'var(--sidebar-inset-bg)',
                  color: 'var(--sidebar-inset-text-color)',
                }}
              ></textarea>
              {submittingFeedback ? (
                <LineWave color="var(--icon-color)" wrapperStyle={{ margin: '0 auto' }} />
              ) : (
                <button
                  type="submit"
                  className="mt-8 bg-success p-2 rounded-md transition-all hover:opacity-50"
                  style={{
                    color: 'var(--sidebar-inset-text-color)',
                  }}
                >
                  Submit Feedback
                </button>
              )}
            </form>
          </div>
        </div>
      </Modal>
      <div className="mb-6">
        <hr className="opacity-20 mb-8" />
        <div className="items flex items-center justify-between">
          <div className="avatar hover:opacity-50 transition-all" onClick={() => navigate('/settings')}>
            <img
              src={
                profile.avatar
                  ? profile.avatar
                  : 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'
              }
              alt="avatar"
              className="rounded-full w-12 h-12 cursor-pointer"
            />
          </div>
          <Link
            to="/settings"
            data-tooltip-id="settings-tooltip"
            className="opacity-50 hover:opacity-100 cursor-pointer transition-all"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M9.24995 22L8.84995 18.8C8.63329 18.7167 8.42895 18.6167 8.23695 18.5C8.04495 18.3833 7.85762 18.2583 7.67495 18.125L4.69995 19.375L1.94995 14.625L4.52495 12.675C4.50828 12.5583 4.49995 12.4457 4.49995 12.337V11.663C4.49995 11.5543 4.50828 11.4417 4.52495 11.325L1.94995 9.375L4.69995 4.625L7.67495 5.875C7.85828 5.74167 8.04995 5.61667 8.24995 5.5C8.44995 5.38333 8.64995 5.28333 8.84995 5.2L9.24995 2H14.75L15.15 5.2C15.3666 5.28333 15.571 5.38333 15.763 5.5C15.955 5.61667 16.1423 5.74167 16.325 5.875L19.2999 4.625L22.0499 9.375L19.475 11.325C19.4916 11.4417 19.5 11.5543 19.5 11.663V12.337C19.5 12.4457 19.4833 12.5583 19.45 12.675L22.025 14.625L19.275 19.375L16.325 18.125C16.1416 18.2583 15.95 18.3833 15.75 18.5C15.55 18.6167 15.35 18.7167 15.15 18.8L14.75 22H9.24995ZM12.05 15.5C13.0166 15.5 13.8416 15.1583 14.525 14.475C15.2083 13.7917 15.55 12.9667 15.55 12C15.55 11.0333 15.2083 10.2083 14.525 9.525C13.8416 8.84167 13.0166 8.5 12.05 8.5C11.0666 8.5 10.2373 8.84167 9.56195 9.525C8.88662 10.2083 8.54928 11.0333 8.54995 12C8.54995 12.9667 8.88729 13.7917 9.56195 14.475C10.2366 15.1583 11.066 15.5 12.05 15.5Z"
                fill={'var(--icon-color)'}
              />
            </svg>
          </Link>
          <svg
            onClick={() => {
              setRuntime({ ...runtime, showFeedbackWindow: true });
            }}
            data-tooltip-id="feedback-tooltip"
            className="opacity-50 hover:opacity-100 cursor-pointer transition-all outline-none"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clipPath="url(#clip0_8_18)">
              <path
                d="M19.149 2.32799C19.995 1.86299 21 2.48899 21 3.42599V20.574C21 21.511 19.995 22.137 19.149 21.672C18.012 21.048 14.646 19.23 12.631 18.429C11.3815 17.9253 10.0818 17.5566 8.754 17.329L7.981 21.196C7.95526 21.3248 7.9044 21.4473 7.83132 21.5565C7.75824 21.6657 7.66437 21.7594 7.55508 21.8323C7.44578 21.9051 7.3232 21.9558 7.19433 21.9813C7.06546 22.0068 6.93283 22.0067 6.804 21.981C6.67517 21.9553 6.55268 21.9044 6.44351 21.8313C6.33434 21.7582 6.24063 21.6644 6.16774 21.5551C6.09484 21.4458 6.04419 21.3232 6.01867 21.1943C5.99315 21.0655 5.99326 20.9328 6.019 20.804L6.762 17.089C6.49258 17.0688 6.22289 17.0525 5.953 17.04C4.35 16.966 3 15.671 3 14V9.99999C3 8.32899 4.35 7.03399 5.953 6.95999C6.308 6.94299 6.657 6.92099 7 6.89199V16H7.034C7.12177 15.848 7.24801 15.7218 7.40002 15.634C7.55204 15.5462 7.72447 15.5 7.9 15.5C8.07553 15.5 8.24796 15.5462 8.39998 15.634C8.55199 15.7218 8.67823 15.848 8.766 16H9V6.62799C10.2421 6.39727 11.4582 6.04318 12.63 5.57099C14.646 4.76999 18.012 2.95099 19.149 2.32799Z"
                fill={'var(--icon-color)'}
              />
            </g>
            <defs>
              <clipPath id="clip0_8_18">
                <rect width="24" height="24" fill={'var(--icon-color)'} />
              </clipPath>
            </defs>
          </svg>
          <svg
            data-tooltip-id="help-tooltip"
            onClick={() => {
              setRuntime({ ...runtime, showFeedbackWindow: true });
              setFeedbackForm({
                ...feedbackForm,
                category: 'Help',
                feedback: 'I need help with: ',
              });
            }}
            className="opacity-50 hover:opacity-100 cursor-pointer transition-all"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11.95 18C12.3 18 12.596 17.879 12.838 17.637C13.08 17.395 13.2007 17.0993 13.2 16.75C13.2 16.4 13.0793 16.104 12.838 15.862C12.5967 15.62 12.3007 15.4993 11.95 15.5C11.6 15.5 11.3043 15.621 11.063 15.863C10.8217 16.105 10.7007 16.4007 10.7 16.75C10.7 17.1 10.821 17.396 11.063 17.638C11.305 17.88 11.6007 18.0007 11.95 18ZM11.05 14.15H12.9C12.9 13.6 12.9627 13.1667 13.088 12.85C13.2133 12.5333 13.5673 12.1 14.15 11.55C14.5833 11.1167 14.925 10.704 15.175 10.312C15.425 9.92 15.55 9.44933 15.55 8.9C15.55 7.96667 15.2083 7.25 14.525 6.75C13.8417 6.25 13.0333 6 12.1 6C11.15 6 10.379 6.25 9.787 6.75C9.195 7.25 8.78267 7.85 8.55 8.55L10.2 9.2C10.2833 8.9 10.471 8.575 10.763 8.225C11.055 7.875 11.5007 7.7 12.1 7.7C12.6333 7.7 13.0333 7.846 13.3 8.138C13.5667 8.43 13.7 8.75067 13.7 9.1C13.7 9.43333 13.6 9.746 13.4 10.038C13.2 10.33 12.95 10.6007 12.65 10.85C11.9167 11.5 11.4667 11.9917 11.3 12.325C11.1333 12.6583 11.05 13.2667 11.05 14.15ZM12 22C10.6167 22 9.31667 21.7373 8.1 21.212C6.88333 20.6867 5.825 19.9743 4.925 19.075C4.025 18.175 3.31267 17.1167 2.788 15.9C2.26333 14.6833 2.00067 13.3833 2 12C2 10.6167 2.26267 9.31667 2.788 8.1C3.31333 6.88333 4.02567 5.825 4.925 4.925C5.825 4.025 6.88333 3.31267 8.1 2.788C9.31667 2.26333 10.6167 2.00067 12 2C13.3833 2 14.6833 2.26267 15.9 2.788C17.1167 3.31333 18.175 4.02567 19.075 4.925C19.975 5.825 20.6877 6.88333 21.213 8.1C21.7383 9.31667 22.0007 10.6167 22 12C22 13.3833 21.7373 14.6833 21.212 15.9C20.6867 17.1167 19.9743 18.175 19.075 19.075C18.175 19.975 17.1167 20.6877 15.9 21.213C14.6833 21.7383 13.3833 22.0007 12 22Z"
              fill={'var(--icon-color)'}
            />
          </svg>
          <Tooltip id="settings-tooltip">Settings</Tooltip>
          <Tooltip id="feedback-tooltip">Feedback</Tooltip>
          <Tooltip id="help-tooltip">Help</Tooltip>
        </div>
      </div>
    </>
  );
};
