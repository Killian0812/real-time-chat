import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Toaster, toast } from 'alert';
import $ from 'jquery';
import 'datatables.net-dt/js/dataTables.dataTables.min.js';
import 'datatables.net-dt/css/dataTables.dataTables.min.css';
import '../radix-ui.css';

import useFirebase from '../hooks/useFirebase';
import useAuth from '../hooks/useAuth';
import useAxiosPrivate from '../hooks/useAxiosPrivate';
import { ref, getDownloadURL } from "firebase/storage";
import { formatDate } from '../tools/date.formatter';

const RoomDetail = () => {
    const { roomId } = useParams();
    const { auth } = useAuth();
    const navigate = useNavigate();
    const [roomDetails, setRoomDetails] = useState({});
    const [roomEntries, setRoomEntries] = useState([]);
    const { storage } = useFirebase();
    const axiosPrivate = useAxiosPrivate();

    useEffect(() => { // update entries face image
        const imgs = document.getElementsByTagName("img");
        Array.from(imgs).forEach(async (img) => {
            img.src = await getDownloadURL(ref(storage, img.getAttribute("image")))
        });
    }, [roomEntries, storage]);

    useEffect(() => { // init DataTables 
        if (roomEntries?.length <= 0)
            return;

        const entriesTable = $('#entries').DataTable({
            columnDefs: [
                { className: "dt-head-center", targets: [0, 1, 2] },
            ],
            order: []
        });
        return () => {
            if ($.fn.DataTable.isDataTable(entriesTable)) {
                entriesTable.destroy(true);
            }
        };
    }, [roomEntries]);

    useEffect(() => { // fetch data
        async function fetchRoomData() {
            const res = await axiosPrivate.get(`/home/roomDetails?id=${roomId}`);
            setRoomDetails(res.data);
            axiosPrivate.get(`/home/roomEntries?mac=${res.data.mac}`).then((res2) => {
                setRoomEntries(res2.data);
            });
        } // merge 2 fetch later
        fetchRoomData();
    }, [roomId, axiosPrivate]);

    const entriesList = roomEntries.map((entry) => {
        return (
            <tr key={entry._id}>
                <td style={{ textAlign: "center" }}>
                    <img image={entry.image} src="/loading.png" width="100" height="100" alt="face" />
                </td>
                <td>{entry.name}</td>
                <td>{formatDate(entry.createdAt)}</td>
            </tr>
        );
    }).reverse();

    const handleRoomUnregiser = async () => {
        axiosPrivate.post(`/home/roomUnregister`, { roomId: roomId, username: auth.username })
            .then(() => {
                toast(`You are no longer ${roomDetails.name}'s manager`);
                navigate("/dashboard/rooms", { replace: true });
            })
            .catch((err) => {
                toast('Unexpected error');
                console.log("Error unregistering as manager:", err);
            })
    }

    return (
        <>
            <div className='RoomDetails'>
                <h2>Room name: {roomDetails.name}</h2>
                <p>Room ID: {roomId}</p>
                <p>Device MAC Address: {roomDetails.mac}</p>
            </div>
            <div className='RoomEntries'>
                <section className="entriesSection">
                    <h1>Room Entries</h1><hr></hr><br></br>
                    <table id='entries' style={{ width: "100%" }}>
                        <thead>
                            <tr>
                                <th>Image</th>
                                <th>Name</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {
                                entriesList
                            }
                        </tbody>
                    </table>
                </section>
                <AlertDialog.Root>
                    <AlertDialog.Trigger asChild>
                        <button className='unsubcribe-btn' >Unregister as Manager</button>
                    </AlertDialog.Trigger>
                    <AlertDialog.Portal>
                        <AlertDialog.Overlay className="AlertDialogOverlay" />
                        <AlertDialog.Content className="AlertDialogContent">
                            <AlertDialog.Title className="AlertDialogTitle">Are you absolutely sure?</AlertDialog.Title>
                            <br></br>
                            <AlertDialog.Description className="AlertDialogDescription">
                                This action cannot be undone by yourself.
                                <br></br>
                                You will no longer be able to approve incoming entry
                                requests as well as view entry list of this room.
                            </AlertDialog.Description>
                            <div style={{ display: 'flex', gap: 25, justifyContent: 'flex-end' }}>
                                <AlertDialog.Cancel asChild>
                                    <button className="Button mauve">Cancel</button>
                                </AlertDialog.Cancel>
                                <AlertDialog.Action asChild>
                                    <button className="Button red" onClick={() => { handleRoomUnregiser() }}>Yes, confirm action</button>
                                </AlertDialog.Action>
                            </div>
                        </AlertDialog.Content>
                    </AlertDialog.Portal>
                </AlertDialog.Root>
            </div>
            {/* toast for error msg */}
            <Toaster position='top-right' />
        </>
    );
};

export default RoomDetail;